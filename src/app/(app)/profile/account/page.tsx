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

export default function AccountPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [isEditing, setIsEditing] = useState(false);
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
      if (!user?.id) return;
      const { data } = await supabase
        .from('profiles')
        .select('display_name, age')
        .eq('id', user.id)
        .single();
      if (data) {
        setName(data.display_name || '');
        setAge(data.age?.toString() || '');
      }
    };
    fetchProfile();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      const updateData: { display_name: string; age?: number } = {
        display_name: name,
      };
      if (age && !isNaN(parseInt(age))) {
        updateData.age = parseInt(age);
      }
      await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);
      setIsEditing(false);
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
      <div style={s.headerRow}>
        <h1 style={s.pageTitle}>Account Info</h1>
        {!isEditing ? (
          <button style={s.editBtn} onClick={() => setIsEditing(true)}>
            Edit
          </button>
        ) : (
          <button
            style={{ ...s.editBtn, opacity: isSaving ? 0.6 : 1 }}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        )}
      </div>

      <div style={s.infoCard}>
        <div style={s.infoRow}>
          <span style={s.infoLabel}>Name</span>
          {isEditing ? (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              style={s.input}
            />
          ) : (
            <span style={s.infoValue}>{name || <span style={s.emptyValue}>Not set</span>}</span>
          )}
        </div>
        <div style={s.infoRow}>
          <span style={s.infoLabel}>Age</span>
          {isEditing ? (
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Enter your age"
              style={s.input}
              min="1"
              max="120"
            />
          ) : (
            <span style={s.infoValue}>{age || <span style={s.emptyValue}>Not set</span>}</span>
          )}
        </div>
        <div style={s.infoRow}>
          <span style={s.infoLabel}>Email</span>
          <span style={s.infoValue}>{account.email}</span>
        </div>
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
    </ProfileSubPageWrapper>
  );
}

const s: Record<string, React.CSSProperties> = {
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: 700,
    color: colors.textPrimary,
    marginBottom: 0,
    marginTop: 0,
    letterSpacing: -0.5,
  },
  editBtn: {
    background: 'none',
    border: `1px solid ${colors.border}`,
    borderRadius: 8,
    padding: '8px 16px',
    color: colors.cyan,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  input: {
    width: '100%',
    background: colors.background,
    border: `1px solid ${colors.border}`,
    borderRadius: 8,
    padding: '10px 12px',
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 500,
    outline: 'none',
    marginTop: 4,
    boxSizing: 'border-box' as const,
  },
  emptyValue: {
    color: colors.textFaint,
    fontStyle: 'italic' as const,
  },
  infoCard: {
    backgroundColor: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 32,
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
    marginBottom: 6,
    display: 'block',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 500,
    color: colors.textPrimary,
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
};
