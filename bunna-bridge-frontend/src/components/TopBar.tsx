import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Bell, Menu, Mail, AlertTriangle,
  CheckSquare, ChevronDown, LogOut, Settings, User, Leaf
} from 'lucide-react';
import RoleBadge from './RoleBadge';
import {
  getNotifications, getUnreadCount, markRead, markAllRead,
} from '../api/notifications';
import type { NotificationItem } from '../api/notifications';

interface TopBarProps {
  onMenuToggle: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onMenuToggle }) => {
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfile] = useState(false);
  const notifRef   = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const navigate    = useNavigate();
  const { user, logout } = useAuth();

  const notifiedIds      = useRef<Set<number>>(new Set());
  const initialLoadDone  = useRef(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn:  getNotifications,
    refetchInterval: 30000,
  });

  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn:  getUnreadCount,
    refetchInterval: 30000,
  });

  const unreadCount = unreadData?.count ?? 0;

  const invalidateBoth = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
  };

  const markReadMutation    = useMutation({ mutationFn: markRead,    onSuccess: invalidateBoth });
  const markAllReadMutation = useMutation({ mutationFn: markAllRead, onSuccess: invalidateBoth });

  useEffect(() => {
    if (notifications.length === 0) return;
    if (!initialLoadDone.current) {
      notifications.forEach(n => notifiedIds.current.add(n.id));
      initialLoadDone.current = true;
      return;
    }
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    notifications.filter(n => !n.is_read && !notifiedIds.current.has(n.id)).forEach(item => {
      notifiedIds.current.add(item.id);
      const push = new Notification(item.title, { body: item.message, icon: '/favicon.ico' });
      push.onclick = () => { window.focus(); handleNotificationClick(item); };
    });
  }, [notifications]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current   && !notifRef.current.contains(e.target as Node))   setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfile(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.is_read) markReadMutation.mutate(item.id);
    setNotifOpen(false);
    if (item.link) navigate(item.link);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'sample_request': return <Mail      className="w-4 h-4" style={{ color: '#7B4B2A' }} />;
      case 'lot_status':     return <Leaf      className="w-4 h-4" style={{ color: '#1B4D35' }} />;
      case 'eudr_alert':     return <AlertTriangle className="w-4 h-4" style={{ color: '#C0392B' }} />;
      default:               return <Bell      className="w-4 h-4" style={{ color: '#4A4A45' }} />;
    }
  };

  const userName = user?.first_name
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : user?.email?.split('@')[0] ?? '—';

  const initials = (user?.first_name?.[0] || user?.email?.[0] || '?').toUpperCase();

  return (
    <header
      style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid rgba(28,28,26,0.08)', boxShadow: '0 1px 0 rgba(28,28,26,0.06)' }}
      className="h-14 flex items-center justify-between px-4 sticky top-0 z-40"
    >
      {/* Left — hamburger + brand */}
      <div className="flex items-center gap-3">
        <button onClick={onMenuToggle} className="md:hidden" style={{ color: '#4A4A45', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <Menu className="w-5 h-5" />
        </button>
        <span
          style={{ fontFamily: 'Playfair Display, serif', fontSize: '1.1rem', fontWeight: 500, color: '#1B4D35', letterSpacing: '0.01em' }}
          className="hidden md:block"
        >
          Beersheba
        </span>
      </div>

      {/* Right — notifications + profile */}
      <div className="flex items-center gap-2">

        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setNotifOpen(o => !o); setProfile(false); }}
            className="p-2 rounded transition-colors relative"
            style={{
              color: notifOpen ? '#1B4D35' : '#4A4A45',
              background: notifOpen ? '#E8F2EC' : 'transparent',
              border: 'none', cursor: 'pointer',
            }}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span
                style={{ backgroundColor: '#C0392B' }}
                className="absolute top-1 right-1 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div
              style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(28,28,26,0.1)', boxShadow: '0 4px 16px rgba(28,28,26,0.12)' }}
              className="absolute right-0 mt-2 w-80 rounded-lg overflow-hidden flex flex-col z-50"
            >
              {/* Header */}
              <div
                style={{ backgroundColor: '#F7F5F0', borderBottom: '1px solid rgba(28,28,26,0.08)' }}
                className="px-3 py-2 flex justify-between items-center"
              >
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(28,28,26,0.5)' }}>
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllReadMutation.mutate()}
                    disabled={markAllReadMutation.isPending}
                    className="flex items-center gap-1 transition-colors"
                    style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.6rem', color: '#1B4D35', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <CheckSquare className="w-3 h-3" />
                    Mark all read
                  </button>
                )}
              </div>

              {/* List */}
              <div className="overflow-y-auto max-h-80">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center" style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.7rem', color: 'rgba(28,28,26,0.3)' }}>
                    No notifications yet
                  </div>
                ) : (
                  notifications.map(item => (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      style={{
                        borderBottom: '1px solid rgba(28,28,26,0.06)',
                        background: !item.is_read ? '#F0EDE6' : 'transparent',
                        cursor: 'pointer',
                      }}
                      className="px-3 py-2.5 flex gap-2.5 items-start transition-colors hover:bg-[#F7F5F0]"
                    >
                      <div style={{ background: '#F0EDE6', borderRadius: '4px', border: '1px solid rgba(28,28,26,0.06)' }} className="p-1 mt-0.5 shrink-0">
                        {getIcon(item.notification_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate" style={{ color: '#1C1C1A', fontWeight: !item.is_read ? 600 : 400 }}>
                          {item.title}
                        </p>
                        <p className="text-[11px] line-clamp-2 mt-0.5 leading-relaxed" style={{ color: 'rgba(28,28,26,0.55)' }}>
                          {item.message}
                        </p>
                        <p style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.55rem', color: 'rgba(28,28,26,0.3)', marginTop: '4px', textTransform: 'uppercase' }}>
                          {new Date(item.created_at).toLocaleString([], {
                            month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                      {!item.is_read && (
                        <div style={{ backgroundColor: '#1B4D35' }} className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ width: '1px', height: '20px', background: 'rgba(28,28,26,0.1)' }} />

        {/* Profile dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => { setProfile(o => !o); setNotifOpen(false); }}
            className="flex items-center gap-2 px-2 py-1 rounded transition-colors"
            style={{ background: profileOpen ? '#F0EDE6' : 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <div style={{
              width: '28px', height: '28px', borderRadius: '4px',
              background: '#E8F2EC', border: '1px solid rgba(27,77,53,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'DM Mono, monospace', fontSize: '11px', color: '#1B4D35', fontWeight: 600,
            }}>
              {initials}
            </div>
            <span className="text-xs hidden md:block" style={{ fontFamily: 'DM Mono, monospace', color: '#4A4A45' }}>
              {userName}
            </span>
            <ChevronDown
              className="w-3 h-3 hidden md:block"
              style={{ color: 'rgba(28,28,26,0.35)', transform: profileOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            />
          </button>

          {profileOpen && (
            <div
              style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(28,28,26,0.1)', boxShadow: '0 4px 16px rgba(28,28,26,0.12)' }}
              className="absolute right-0 mt-2 w-56 rounded-lg z-50 overflow-hidden"
            >
              {/* User info */}
              <div style={{ borderBottom: '1px solid rgba(28,28,26,0.08)', background: '#F7F5F0' }} className="px-3 py-2.5">
                <p className="text-xs font-medium truncate" style={{ color: '#1C1C1A' }}>{userName}</p>
                <p className="text-[10px] truncate mt-0.5" style={{ fontFamily: 'DM Mono, monospace', color: 'rgba(28,28,26,0.4)' }}>
                  {user?.email}
                </p>
                {user && <div className="mt-1.5"><RoleBadge role={user.role} /></div>}
              </div>

              {/* Menu items */}
              <div className="py-1">
                {[
                  { icon: <User className="w-3.5 h-3.5" />,     label: 'Profile',  action: () => { navigate('/profile');  setProfile(false); } },
                  { icon: <Settings className="w-3.5 h-3.5" />, label: 'Settings', action: () => { navigate('/settings'); setProfile(false); } },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={item.action}
                    className="w-full flex items-center gap-3 px-3 py-2 text-xs transition-colors hover:bg-[#F7F5F0]"
                    style={{ fontFamily: 'DM Mono, monospace', color: 'rgba(28,28,26,0.55)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <span style={{ color: 'rgba(28,28,26,0.3)' }}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Logout */}
              <div style={{ borderTop: '1px solid rgba(28,28,26,0.08)' }} className="py-1">
                <button
                  onClick={() => { logout(); setProfile(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-xs transition-colors hover:bg-[#FDECEA]"
                  style={{ fontFamily: 'DM Mono, monospace', color: '#C0392B', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopBar;
