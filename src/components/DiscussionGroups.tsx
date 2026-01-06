import { useState, useEffect } from 'react';
import { MessageSquare, Users, Plus, Send, ThumbsUp, Pin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function DiscussionGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      loadMessages(selectedGroup.id);
    }
  }, [selectedGroup]);

  const loadGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('discussion_groups')
        .select(`
          *,
          group_members(count)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading groups:', error);
        return;
      }

      if (data) {
        setGroups(data);
      }
    } catch (error) {
      console.error('Error in loadGroups:', error);
    }
  };

  const loadMessages = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('group_messages')
        .select(`
          *,
          user_profiles(username, avatar_url)
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      if (data) {
        setMessages(data);
      }
    } catch (error) {
      console.error('Error in loadMessages:', error);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newGroupName.trim()) return;

    const { data: newGroup, error } = await supabase
      .from('discussion_groups')
      .insert({
        name: newGroupName.trim(),
        description: newGroupDescription.trim(),
        created_by: user.id,
        is_active: true,
      })
      .select()
      .single();

    if (!error && newGroup) {
      await supabase.from('group_members').insert({
        group_id: newGroup.id,
        user_id: user.id,
        role: 'admin',
      });

      setNewGroupName('');
      setNewGroupDescription('');
      setShowCreateGroup(false);
      await loadGroups();
      setSelectedGroup(newGroup);
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    if (!user) return;

    const { error } = await supabase.from('group_members').insert({
      group_id: groupId,
      user_id: user.id,
      role: 'member',
    });

    if (!error) {
      await loadGroups();
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedGroup || !newMessage.trim()) return;

    const { error } = await supabase.from('group_messages').insert({
      group_id: selectedGroup.id,
      user_id: user.id,
      content: newMessage.trim(),
    });

    if (!error) {
      setNewMessage('');
      await loadMessages(selectedGroup.id);
    }
  };

  const handleReaction = async (messageId: string) => {
    if (!user) return;

    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    await supabase
      .from('group_messages')
      .update({ reactions: (message.reactions || 0) + 1 })
      .eq('id', messageId);

    await loadMessages(selectedGroup.id);
  };

  if (!selectedGroup) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Discussion Groups</h2>
            <p className="text-gray-600">Connect with the Kokaa community</p>
          </div>
          {user && (
            <button
              onClick={() => setShowCreateGroup(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all"
            >
              <Plus className="w-5 h-5" />
              Create Group
            </button>
          )}
        </div>

        {showCreateGroup && (
          <form
            onSubmit={handleCreateGroup}
            className="bg-white rounded-xl p-6 border-2 border-blue-200 shadow-lg"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">Create New Group</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Group Name
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g., Tech Deals Enthusiasts"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="Describe what this group is about..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Create Group
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateGroup(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <div
              key={group.id}
              className="bg-white rounded-xl p-6 border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all cursor-pointer"
              onClick={() => setSelectedGroup(group)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="bg-gradient-to-br from-blue-500 to-purple-500 rounded-full p-3">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Users className="w-4 h-4" />
                  <span>{group.group_members?.[0]?.count || 0}</span>
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{group.name}</h3>
              <p className="text-sm text-gray-600 line-clamp-2 mb-3">{group.description}</p>
              {user && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleJoinGroup(group.id);
                  }}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm"
                >
                  Join Group
                </button>
              )}
            </div>
          ))}
        </div>

        {groups.length === 0 && (
          <div className="text-center py-20 bg-white rounded-xl">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-semibold">No groups yet</p>
            <p className="text-gray-400">Be the first to create a discussion group!</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden h-[600px] flex flex-col">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedGroup(null)}
            className="hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
          >
            ←
          </button>
          <div>
            <h3 className="text-xl font-bold">{selectedGroup.name}</h3>
            <p className="text-sm opacity-90">{selectedGroup.description}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message) => (
          <div key={message.id} className="flex gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
              {message.user_profiles?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1">
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900 text-sm">
                    {message.user_profiles?.username || 'Anonymous'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(message.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-gray-700">{message.content}</p>
              </div>
              <button
                onClick={() => handleReaction(message.id)}
                disabled={!user}
                className="flex items-center gap-1 text-xs text-gray-600 hover:text-blue-600 mt-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ThumbsUp className="w-3 h-3" />
                <span>{message.reactions || 0}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {user && (
        <form onSubmit={handleSendMessage} className="p-4 border-t bg-white">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      )}

      {!user && (
        <div className="p-4 border-t bg-gray-50 text-center">
          <p className="text-gray-600 text-sm">Sign in to join the conversation</p>
        </div>
      )}
    </div>
  );
}
