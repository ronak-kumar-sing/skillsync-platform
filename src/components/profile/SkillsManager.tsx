'use client';

import React, { useEffect, useState } from 'react';
import { UserSkill, Skill, AddSkillRequest } from '@/types';

interface SkillsManagerProps {
  userSkills: UserSkill[];
  onSkillsChange: () => void;
}

export default function SkillsManager({ userSkills, onSkillsChange }: SkillsManagerProps) {
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<string>('');
  const [proficiencyLevel, setProficiencyLevel] = useState<1 | 2 | 3 | 4 | 5>(1);

  useEffect(() => {
    fetchAvailableSkills();
  }, []);

  const fetchAvailableSkills = async () => {
    try {
      const response = await fetch('/api/profile/skills');
      if (!response.ok) throw new Error('Failed to fetch skills');

      const data = await response.json();
      setAvailableSkills(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load skills');
    }
  };

  const addSkill = async () => {
    if (!selectedSkill || !proficiencyLevel) return;

    try {
      setLoading(true);
      const response = await fetch('/api/profile/skills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          skillId: selectedSkill,
          proficiencyLevel,
        } as AddSkillRequest),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add skill');
      }

      setShowAddSkill(false);
      setSelectedSkill('');
      setProficiencyLevel(1);
      onSkillsChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add skill');
    } finally {
      setLoading(false);
    }
  };

  const updateSkill = async (skillId: string, newLevel: 1 | 2 | 3 | 4 | 5) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/profile/skills/${skillId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ proficiencyLevel: newLevel }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update skill');
      }

      onSkillsChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update skill');
    } finally {
      setLoading(false);
    }
  };

  const removeSkill = async (skillId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/profile/skills/${skillId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove skill');
      }

      onSkillsChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove skill');
    } finally {
      setLoading(false);
    }
  };

  const getProficiencyLabel = (level: number) => {
    const labels = {
      1: 'Beginner',
      2: 'Novice',
      3: 'Intermediate',
      4: 'Advanced',
      5: 'Expert',
    };
    return labels[level as keyof typeof labels];
  };

  const getProficiencyColor = (level: number) => {
    const colors = {
      1: 'bg-red-500',
      2: 'bg-orange-500',
      3: 'bg-yellow-500',
      4: 'bg-blue-500',
      5: 'bg-green-500',
    };
    return colors[level as keyof typeof colors];
  };

  const getUnaddedSkills = () => {
    const userSkillIds = userSkills.map(us => us.skillId);
    return availableSkills.filter(skill => !userSkillIds.includes(skill.id));
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Skills</h3>
        <button
          onClick={() => setShowAddSkill(true)}
          className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
          disabled={loading}
        >
          Add Skill
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

      {/* Current Skills */}
      <div className="space-y-3 mb-6">
        {userSkills.length === 0 ? (
          <div className="text-center py-8 text-white/60">
            <p>No skills added yet. Add your first skill to get started!</p>
          </div>
        ) : (
          userSkills.map((userSkill) => (
            <div
              key={userSkill.id}
              className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h4 className="text-white font-medium">{userSkill.skill.name}</h4>
                  <span className="text-xs text-white/60 bg-white/10 px-2 py-1 rounded">
                    {userSkill.skill.category}
                  </span>
                  {userSkill.verified && (
                    <span className="text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded">
                      Verified
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-white/70">Proficiency:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <button
                        key={level}
                        onClick={() => updateSkill(userSkill.skillId, level as 1 | 2 | 3 | 4 | 5)}
                        className={`w-3 h-3 rounded-full transition-colors ${level <= userSkill.proficiencyLevel
                            ? getProficiencyColor(userSkill.proficiencyLevel)
                            : 'bg-white/20'
                          }`}
                        disabled={loading}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-white/70 ml-2">
                    {getProficiencyLabel(userSkill.proficiencyLevel)}
                  </span>
                </div>
                {userSkill.endorsements > 0 && (
                  <p className="text-xs text-white/60 mt-1">
                    {userSkill.endorsements} endorsement{userSkill.endorsements !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <button
                onClick={() => removeSkill(userSkill.skillId)}
                className="ml-4 p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                disabled={loading}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add Skill Modal */}
      {showAddSkill && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900/90 backdrop-blur-md rounded-xl p-6 border border-white/20 w-full max-w-md mx-4">
            <h4 className="text-lg font-semibold text-white mb-4">Add New Skill</h4>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Select Skill
                </label>
                <select
                  value={selectedSkill}
                  onChange={(e) => setSelectedSkill(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a skill...</option>
                  {getUnaddedSkills().map((skill) => (
                    <option key={skill.id} value={skill.id} className="bg-gray-800">
                      {skill.name} ({skill.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Proficiency Level
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      onClick={() => setProficiencyLevel(level as 1 | 2 | 3 | 4 | 5)}
                      className={`w-8 h-8 rounded-full transition-colors ${level <= proficiencyLevel
                          ? getProficiencyColor(proficiencyLevel)
                          : 'bg-white/20 hover:bg-white/30'
                        }`}
                    >
                      <span className="text-xs text-white font-medium">{level}</span>
                    </button>
                  ))}
                </div>
                <p className="text-sm text-white/60 mt-1">
                  {getProficiencyLabel(proficiencyLevel)}
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddSkill(false)}
                className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={addSkill}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                disabled={loading || !selectedSkill}
              >
                {loading ? 'Adding...' : 'Add Skill'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}