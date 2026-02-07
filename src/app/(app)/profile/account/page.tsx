'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import ProfileSubPageWrapper from '@/components/layout/ProfileSubPageWrapper';

const colors = {
  background: '#0A0A0A',
  card: '#0D0D0D',
  border: '#1A1A1A',
  textPrimary: '#FFFFFF',
  textMuted: '#6B6B6B',
  textFaint: '#404040',
  borderSubtle: '#333333',
  danger: '#E53935',
  cyan: '#00FFFF',
};

type EditField = 'name' | 'age' | null;

export default function AccountPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [editingField, setEditingField] = useState<EditField>(null);
  const [editValue, setEditValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const account = {
    email: user?.email ?? 'Unknown',
    memberSince: user?.created_at
      ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : 'Unknown',
  };

  // Fetch profile data on mount
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, age')
        .eq('id', user.id)
        .single();
      if (data && !error) {
        setName(data.display_name || '');
        setAge(data.age?.toString() || '');
      }
      setIsLoading(false);
    };
    fetchProfile();
  }, [user?.id]);

  // Don't render content until profile data is loaded
  if (isLoading) {
    return (
      <ProfileSubPageWrapper>
        <h1 style={s.pageTitle}>Account Info</h1>
      </ProfileSubPageWrapper>
    );
  }

  const openEdit = (field: EditField) => {
    if (field === 'name') {
      setEditValue(name);
    } else if (field === 'age') {
      setEditValue(age);
    }
    setEditingField(field);
  };

  const handleSave = async () => {
    if (!user?.id || !editingField) return;
    setIsSaving(true);
    try {
      let updateData: { display_name?: string; age?: number | null } = {};

      if (editingField === 'name') {
        updateData.display_name = editValue;
      } else if (editingField === 'age') {
        if (editValue && !isNaN(parseInt(editValue))) {
          updateData.age = parseInt(editValue);
        } else {
          updateData.age = null;
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) {
        console.error('Save error:', error);
        alert('Failed to save. Please try again.');
        return;
      }

      // Update local state on success
      if (editingField === 'name') {
        setName(editValue);
      } else if (editingField === 'age') {
        setAge(editValue);
      }
      setEditingField(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to permanently delete your account? All your data will be lost and this action cannot be undone.')) {
      return;
    }

    if (user) {
      await supabase.from('completions').delete().eq('user_id', user.id);
      await supabase.from('daily_scores').delete().eq('user_id', user.id);
      await supabase.from('streak_data').delete().eq('user_id', user.id);
      await supabase.from('milestones').delete().eq('user_id', user.id);
      await supabase.from('tasks').delete().eq('user_id', user.id);
      await supabase.from('goals').delete().eq('user_id', user.id);
      await supabase.from('profiles').delete().eq('id', user.id);
    }
    await signOut();
    router.replace('/login');
  };

  return (
    <ProfileSubPageWrapper>
      <h1 style={s.pageTitle}>Account Info</h1>

      <div style={s.infoCard}>
        {/* Name - editable */}
        <button style={s.editableRow} onClick={() => openEdit('name')}>
          <div style={s.rowContent}>
            <span style={s.infoLabel}>Name</span>
            <span style={s.infoValue}>{name || <span style={s.emptyValue}>Not set</span>}</span>
          </div>
          <span style={s.rowArrow}>{'\u203A'}</span>
        </button>

        {/* Age - editable */}
        <button style={s.editableRow} onClick={() => openEdit('age')}>
          <div style={s.rowContent}>
            <span style={s.infoLabel}>Age</span>
            <span style={s.infoValue}>{age || <span style={s.emptyValue}>Not set</span>}</span>
          </div>
          <span style={s.rowArrow}>{'\u203A'}</span>
        </button>

        {/* Email - not editable */}
        <div style={s.infoRow}>
          <span style={s.infoLabel}>Email</span>
          <span style={s.infoValue}>{account.email}</span>
        </div>

        {/* Member Since - not editable */}
        <div style={{ ...s.infoRow, borderBottom: 'none' }}>
          <span style={s.infoLabel}>Member Since</span>
          <span style={s.infoValue}>{account.memberSince}</span>
        </div>
      </div>

      <div style={s.settingsCard}>
        <button style={{ ...s.settingsRow, borderBottom: 'none' }} onClick={handleSignOut}>
          <span style={s.signOutLabel}>Sign Out</span>
          <span style={s.settingsArrow}>{'\u203A'}</span>
        </button>
      </div>

      <div style={{ height: 32 }} />
      <span style={s.sectionTitle}>Danger Zone</span>
      <div style={s.settingsCard}>
        <button style={{ ...s.settingsRow, borderBottom: 'none' }} onClick={handleDeleteAccount}>
          <span style={s.deleteLabel}>Delete Account</span>
          <span style={s.settingsArrow}>{'\u203A'}</span>
        </button>
      </div>

      <p style={s.warningText}>
        Deleting your account will permanently remove all your data including goals, tasks, and progress history.
      </p>

      {/* Edit Modal */}
      {editingField && (
        <div style={s.overlay} onClick={() => setEditingField(null)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={s.modalTitle}>
              Edit {editingField === 'name' ? 'Name' : 'Age'}
            </h2>
            <input
              type={editingField === 'age' ? 'number' : 'text'}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={editingField === 'name' ? 'Enter your name' : 'Enter your age'}
              style={s.input}
              autoFocus
              min={editingField === 'age' ? '1' : undefined}
              max={editingField === 'age' ? '120' : undefined}
            />
            <div style={s.modalButtons}>
              <button style={s.cancelBtn} onClick={() => setEditingField(null)}>
                Cancel
              </button>
              <button
                style={{ ...s.saveBtn, opacity: isSaving ? 0.6 : 1 }}
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProfileSubPageWrapper>
  );
}

const s: Record<string, React.CSSProperties> = {
  pageTitle: {
    fontSize: 32,
    fontWeight: 700,
    color: colors.textPrimary,
    marginBottom: 32,
    marginTop: 0,
    letterSpacing: -0.5,
  },
  infoCard: {
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 32,
  },
  editableRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 20px',
    width: '100%',
    background: 'none',
    border: 'none',
    borderBottom: `1px solid ${colors.border}`,
    cursor: 'pointer',
    boxSizing: 'border-box' as const,
    textAlign: 'left' as const,
  },
  rowContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
  },
  rowArrow: {
    fontSize: 20,
    color: colors.borderSubtle,
    fontWeight: 300,
  },
  infoRow: {
    padding: '18px 20px',
    borderBottom: `1px solid ${colors.border}`,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    display: 'block',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 500,
    color: colors.textPrimary,
    marginTop: 4,
  },
  emptyValue: {
    color: colors.textFaint,
    fontStyle: 'italic' as const,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 1.2,
    marginBottom: 12,
    display: 'block',
  },
  settingsCard: {
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 20px',
    width: '100%',
    background: 'none',
    border: 'none',
    borderBottom: `1px solid ${colors.border}`,
    cursor: 'pointer',
    boxSizing: 'border-box' as const,
  },
  signOutLabel: {
    fontSize: 16,
    fontWeight: 500,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  deleteLabel: {
    fontSize: 16,
    fontWeight: 500,
    color: colors.danger,
    letterSpacing: -0.2,
  },
  settingsArrow: {
    fontSize: 18,
    color: colors.borderSubtle,
    fontWeight: 300,
  },
  warningText: {
    fontSize: 13,
    color: colors.textFaint,
    marginTop: 16,
    lineHeight: '20px',
  },
  // Modal styles
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: colors.textPrimary,
    marginBottom: 20,
    marginTop: 0,
  },
  input: {
    width: '100%',
    background: colors.background,
    border: `1px solid ${colors.border}`,
    borderRadius: 8,
    padding: '12px 14px',
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 500,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  modalButtons: {
    display: 'flex',
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    padding: '12px 16px',
    background: 'none',
    border: `1px solid ${colors.border}`,
    borderRadius: 8,
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  saveBtn: {
    flex: 1,
    padding: '12px 16px',
    background: colors.textPrimary,
    border: 'none',
    borderRadius: 8,
    color: colors.background,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
};
