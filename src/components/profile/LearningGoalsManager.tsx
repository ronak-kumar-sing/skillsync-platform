'use client';

import React, { useState } from 'react';
import { LearningGoal, CreateLearningGoalRequest, UpdateLearningGoalRequest } from '@/types';

interface LearningGoalsManagerProps {
  learningGoals: LearningGoal[];
  onGoalsChange: () => void;
}

export default function LearningGoalsManager({ learningGoals, onGoalsChange }: LearningGoalsManagerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<LearningGoal | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetDate: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      targetDate: '',
      priority: 'medium',
    });
    setEditingGoal(null);
    setShowAddGoal(false);
  };

  const openEditGoal = (goal: LearningGoal) => {
    setFormData({
      title: goal.title,
      description: goal.description || '',
      targetDate: goal.targetDate ? goal.targetDate.toISOString().split('T')[0] : '',
      priority: goal.priority,
    });
    setEditingGoal(goal);
    setShowAddGoal(true);
  };

  const createGoal = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/profile/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || undefined,
          targetDate: formData.targetDate || undefined,
          priority: formData.priority,
        } as CreateLearningGoalRequest),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create goal');
      }

      resetForm();
      onGoalsChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create goal');
    } finally {
      setLoading(false);
    }
  };

  const updateGoal = async () => {
    if (!editingGoal) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/profile/goals/${editingGoal.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || undefined,
          targetDate: formData.targetDate || undefined,
          priority: formData.priority,
        } as UpdateLearningGoalRequest),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update goal');
      }

      resetForm();
      onGoalsChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update goal');
    } finally {
      setLoading(false);
    }
  };

  const toggleGoalStatus = async (goal: LearningGoal) => {
    const newStatus = goal.status === 'completed' ? 'active' : 'completed';

    try {
      setLoading(true);
      const response = await fetch(`/api/profile/goals/${goal.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update goal status');
      }

      onGoalsChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update goal status');
    } finally {
      setLoading(false);
    }
  };

  const deleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this learning goal?')) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/profile/goals/${goalId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete goal');
      }

      onGoalsChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete goal');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-green-500/20 text-green-400 border-green-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      high: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return colors[priority as keyof typeof colors];
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      completed: 'bg-green-500/20 text-green-400 border-green-500/30',
      paused: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    };
    return colors[status as keyof typeof colors];
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Learning Goals</h3>
        <button
          onClick={() => setShowAddGoal(true)}
          className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors"
          disabled={loading}
        >
          Add Goal
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-1 text-red-400 hover:text-red-300 text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Learning Goals List */}
      <div className="space-y-4">
        {learningGoals.length === 0 ? (
          <div className="text-center py-8 text-white/60">
            <p>No learning goals set yet. Add your first goal to get started!</p>
          </div>
        ) : (
          learningGoals.map((goal) => (
            <div
              key={goal.id}
              className={`p-4 rounded-lg border transition-all ${goal.status === 'completed'
                  ? 'bg-green-500/5 border-green-500/20'
                  : 'bg-white/5 border-white/10'
                }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() => toggleGoalStatus(goal)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${goal.status === 'completed'
                          ? 'bg-green-500 border-green-500'
                          : 'border-white/40 hover:border-white/60'
                        }`}
                      disabled={loading}
                    >
                      {goal.status === 'completed' && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <h4 className={`font-medium ${goal.status === 'completed' ? 'text-white/70 line-through' : 'text-white'}`}>
                      {goal.title}
                    </h4>
                  </div>

                  {goal.description && (
                    <p className="text-white/70 text-sm mb-2">{goal.description}</p>
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-1 rounded border ${getPriorityColor(goal.priority)}`}>
                      {goal.priority} priority
                    </span>
                    <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(goal.status)}`}>
                      {goal.status}
                    </span>
                    {goal.targetDate && (
                      <span className="text-xs text-white/60">
                        Target: {new Date(goal.targetDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => openEditGoal(goal)}
                    className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors"
                    disabled={loading}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => deleteGoal(goal.id)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                    disabled={loading}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Goal Modal */}
      {showAddGoal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900/90 backdrop-blur-md rounded-xl p-6 border border-white/20 w-full max-w-md mx-4">
            <h4 className="text-lg font-semibold text-white mb-4">
              {editingGoal ? 'Edit Learning Goal' : 'Add New Learning Goal'}
            </h4>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., Learn React Hooks"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Describe your learning goal..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Target Date
                </label>
                <input
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="low" className="bg-gray-800">Low Priority</option>
                  <option value="medium" className="bg-gray-800">Medium Priority</option>
                  <option value="high" className="bg-gray-800">High Priority</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={resetForm}
                className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={editingGoal ? updateGoal : createGoal}
                className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
                disabled={loading || !formData.title.trim()}
              >
                {loading ? 'Saving...' : editingGoal ? 'Update Goal' : 'Create Goal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}