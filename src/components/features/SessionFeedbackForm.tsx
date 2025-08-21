'use client';

import React, { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { GlassTextarea } from '@/components/ui/GlassTextarea';
import { GlassSelect } from '@/components/ui/GlassSelect';

interface SessionFeedbackFormProps {
  sessionId: string;
  partnerId: string;
  partnerName: string;
  onSubmit: (feedback: DetailedFeedback) => void;
  onCancel: () => void;
  className?: string;
}

interface DetailedFeedback {
  rating: number;
  feedback?: string;
  skillsLearned: string[];
  skillsTaught: string[];
  learningOutcomes: string[];
  difficultyLevel?: 1 | 2 | 3 | 4 | 5;
  paceRating?: 1 | 2 | 3 | 4 | 5;
  communicationRating?: 1 | 2 | 3 | 4 | 5;
  technicalIssues: string[];
  wouldRecommendPartner?: boolean;
  improvementSuggestions?: string;
  sharedResources: SharedResource[];
}

interface SharedResource {
  type: 'link' | 'file' | 'code' | 'note';
  title: string;
  content: string;
  url?: string;
  metadata?: Record<string, any>;
}

export const SessionFeedbackForm: React.FC<SessionFeedbackFormProps> = ({
  sessionId,
  partnerId,
  partnerName,
  onSubmit,
  onCancel,
  className = ''
}) => {
  const [feedback, setFeedback] = useState<DetailedFeedback>({
    rating: 5,
    feedback: '',
    skillsLearned: [],
    skillsTaught: [],
    learningOutcomes: [],
    difficultyLevel: 3,
    paceRating: 3,
    communicationRating: 5,
    technicalIssues: [],
    wouldRecommendPartner: true,
    improvementSuggestions: '',
    sharedResources: []
  });

  const [currentSkillLearned, setCurrentSkillLearned] = useState('');
  const [currentSkillTaught, setCurrentSkillTaught] = useState('');
  const [currentOutcome, setCurrentOutcome] = useState('');
  const [currentTechnicalIssue, setCurrentTechnicalIssue] = useState('');
  const [currentResource, setCurrentResource] = useState<Partial<SharedResource>>({
    type: 'link',
    title: '',
    content: '',
    url: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'detailed' | 'resources'>('basic');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (feedback.rating < 1 || feedback.rating > 5) {
      alert('Please provide a rating between 1 and 5');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(feedback);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const addSkillLearned = () => {
    if (currentSkillLearned.trim()) {
      setFeedback(prev => ({
        ...prev,
        skillsLearned: [...prev.skillsLearned, currentSkillLearned.trim()]
      }));
      setCurrentSkillLearned('');
    }
  };

  const removeSkillLearned = (index: number) => {
    setFeedback(prev => ({
      ...prev,
      skillsLearned: prev.skillsLearned.filter((_, i) => i !== index)
    }));
  };

  const addSkillTaught = () => {
    if (currentSkillTaught.trim()) {
      setFeedback(prev => ({
        ...prev,
        skillsTaught: [...prev.skillsTaught, currentSkillTaught.trim()]
      }));
      setCurrentSkillTaught('');
    }
  };

  const removeSkillTaught = (index: number) => {
    setFeedback(prev => ({
      ...prev,
      skillsTaught: prev.skillsTaught.filter((_, i) => i !== index)
    }));
  };

  const addLearningOutcome = () => {
    if (currentOutcome.trim()) {
      setFeedback(prev => ({
        ...prev,
        learningOutcomes: [...prev.learningOutcomes, currentOutcome.trim()]
      }));
      setCurrentOutcome('');
    }
  };

  const removeLearningOutcome = (index: number) => {
    setFeedback(prev => ({
      ...prev,
      learningOutcomes: prev.learningOutcomes.filter((_, i) => i !== index)
    }));
  };

  const addTechnicalIssue = () => {
    if (currentTechnicalIssue.trim()) {
      setFeedback(prev => ({
        ...prev,
        technicalIssues: [...prev.technicalIssues, currentTechnicalIssue.trim()]
      }));
      setCurrentTechnicalIssue('');
    }
  };

  const removeTechnicalIssue = (index: number) => {
    setFeedback(prev => ({
      ...prev,
      technicalIssues: prev.technicalIssues.filter((_, i) => i !== index)
    }));
  };

  const addSharedResource = () => {
    if (currentResource.title && currentResource.content) {
      setFeedback(prev => ({
        ...prev,
        sharedResources: [...prev.sharedResources, currentResource as SharedResource]
      }));
      setCurrentResource({
        type: 'link',
        title: '',
        content: '',
        url: ''
      });
    }
  };

  const removeSharedResource = (index: number) => {
    setFeedback(prev => ({
      ...prev,
      sharedResources: prev.sharedResources.filter((_, i) => i !== index)
    }));
  };

  const renderStarRating = (
    value: number,
    onChange: (rating: number) => void,
    label: string
  ) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300">{label}</label>
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i + 1)}
            className={`text-2xl transition-colors ${i < value ? 'text-yellow-400 hover:text-yellow-300' : 'text-gray-600 hover:text-gray-500'
              }`}
          >
            ⭐
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-400">({value}/5)</span>
      </div>
    </div>
  );

  return (
    <GlassCard className={`p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Session Feedback</h2>
        <p className="text-gray-400">
          Share your experience with <span className="text-white font-medium">{partnerName}</span>
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {[
          { key: 'basic', label: 'Basic Feedback' },
          { key: 'detailed', label: 'Detailed Assessment' },
          { key: 'resources', label: 'Shared Resources' }
        ].map((tab) => (
          <GlassButton
            key={tab.key}
            variant={activeTab === tab.key ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab.key as any)}
          >
            {tab.label}
          </GlassButton>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Feedback Tab */}
        {activeTab === 'basic' && (
          <div className="space-y-6">
            {/* Overall Rating */}
            {renderStarRating(
              feedback.rating,
              (rating) => setFeedback(prev => ({ ...prev, rating })),
              'Overall Session Rating'
            )}

            {/* General Feedback */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                General Feedback
              </label>
              <GlassTextarea
                placeholder="Share your thoughts about the session..."
                value={feedback.feedback || ''}
                onChange={(value) => setFeedback(prev => ({ ...prev, feedback: value }))}
                rows={4}
              />
            </div>

            {/* Would Recommend Partner */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Would you recommend {partnerName} to other learners?
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="recommend"
                    checked={feedback.wouldRecommendPartner === true}
                    onChange={() => setFeedback(prev => ({ ...prev, wouldRecommendPartner: true }))}
                    className="text-blue-500"
                  />
                  <span className="text-gray-300">Yes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="recommend"
                    checked={feedback.wouldRecommendPartner === false}
                    onChange={() => setFeedback(prev => ({ ...prev, wouldRecommendPartner: false }))}
                    className="text-blue-500"
                  />
                  <span className="text-gray-300">No</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Detailed Assessment Tab */}
        {activeTab === 'detailed' && (
          <div className="space-y-6">
            {/* Detailed Ratings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {renderStarRating(
                feedback.difficultyLevel || 3,
                (rating) => setFeedback(prev => ({ ...prev, difficultyLevel: rating as 1 | 2 | 3 | 4 | 5 })),
                'Difficulty Level'
              )}
              {renderStarRating(
                feedback.paceRating || 3,
                (rating) => setFeedback(prev => ({ ...prev, paceRating: rating as 1 | 2 | 3 | 4 | 5 })),
                'Session Pace'
              )}
              {renderStarRating(
                feedback.communicationRating || 5,
                (rating) => setFeedback(prev => ({ ...prev, communicationRating: rating as 1 | 2 | 3 | 4 | 5 })),
                'Communication Quality'
              )}
            </div>

            {/* Skills Learned */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Skills You Learned
              </label>
              <div className="flex gap-2">
                <GlassInput
                  placeholder="Add a skill you learned..."
                  value={currentSkillLearned}
                  onChange={setCurrentSkillLearned}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkillLearned())}
                />
                <GlassButton type="button" onClick={addSkillLearned}>
                  Add
                </GlassButton>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {feedback.skillsLearned.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm flex items-center gap-2"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkillLearned(index)}
                      className="text-green-300 hover:text-green-100"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Skills Taught */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Skills You Taught
              </label>
              <div className="flex gap-2">
                <GlassInput
                  placeholder="Add a skill you taught..."
                  value={currentSkillTaught}
                  onChange={setCurrentSkillTaught}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkillTaught())}
                />
                <GlassButton type="button" onClick={addSkillTaught}>
                  Add
                </GlassButton>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {feedback.skillsTaught.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm flex items-center gap-2"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkillTaught(index)}
                      className="text-blue-300 hover:text-blue-100"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Learning Outcomes */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Key Learning Outcomes
              </label>
              <div className="flex gap-2">
                <GlassInput
                  placeholder="Add a learning outcome..."
                  value={currentOutcome}
                  onChange={setCurrentOutcome}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLearningOutcome())}
                />
                <GlassButton type="button" onClick={addLearningOutcome}>
                  Add
                </GlassButton>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {feedback.learningOutcomes.map((outcome, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm flex items-center gap-2"
                  >
                    {outcome}
                    <button
                      type="button"
                      onClick={() => removeLearningOutcome(index)}
                      className="text-purple-300 hover:text-purple-100"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Technical Issues */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Technical Issues (if any)
              </label>
              <div className="flex gap-2">
                <GlassInput
                  placeholder="Describe any technical issues..."
                  value={currentTechnicalIssue}
                  onChange={setCurrentTechnicalIssue}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTechnicalIssue())}
                />
                <GlassButton type="button" onClick={addTechnicalIssue}>
                  Add
                </GlassButton>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {feedback.technicalIssues.map((issue, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-sm flex items-center gap-2"
                  >
                    {issue}
                    <button
                      type="button"
                      onClick={() => removeTechnicalIssue(index)}
                      className="text-red-300 hover:text-red-100"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Improvement Suggestions */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Suggestions for Improvement
              </label>
              <GlassTextarea
                placeholder="Any suggestions to make future sessions better..."
                value={feedback.improvementSuggestions || ''}
                onChange={(value) => setFeedback(prev => ({ ...prev, improvementSuggestions: value }))}
                rows={3}
              />
            </div>
          </div>
        )}

        {/* Shared Resources Tab */}
        {activeTab === 'resources' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Add Shared Resources</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <GlassSelect
                  value={currentResource.type || 'link'}
                  onChange={(value) => setCurrentResource(prev => ({ ...prev, type: value as any }))}
                  options={[
                    { value: 'link', label: 'Link' },
                    { value: 'file', label: 'File' },
                    { value: 'code', label: 'Code Snippet' },
                    { value: 'note', label: 'Note' }
                  ]}
                />
                <GlassInput
                  placeholder="Resource title"
                  value={currentResource.title || ''}
                  onChange={(value) => setCurrentResource(prev => ({ ...prev, title: value }))}
                />
              </div>

              <GlassTextarea
                placeholder="Resource content or description"
                value={currentResource.content || ''}
                onChange={(value) => setCurrentResource(prev => ({ ...prev, content: value }))}
                rows={3}
              />

              {currentResource.type === 'link' && (
                <GlassInput
                  placeholder="URL"
                  value={currentResource.url || ''}
                  onChange={(value) => setCurrentResource(prev => ({ ...prev, url: value }))}
                />
              )}

              <GlassButton type="button" onClick={addSharedResource}>
                Add Resource
              </GlassButton>
            </div>

            {/* Shared Resources List */}
            {feedback.sharedResources.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-300">Shared Resources</h4>
                <div className="space-y-2">
                  {feedback.sharedResources.map((resource, index) => (
                    <div key={index} className="bg-white/5 rounded-lg p-3 flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-white">{resource.title}</span>
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
                            {resource.type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">{resource.content}</p>
                        {resource.url && (
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 text-sm"
                          >
                            {resource.url}
                          </a>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSharedResource(index)}
                        className="text-red-400 hover:text-red-300 ml-2"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end gap-4 pt-6 border-t border-white/10">
          <GlassButton
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </GlassButton>
          <GlassButton
            type="submit"
            variant="primary"
            disabled={submitting}
            loading={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </GlassButton>
        </div>
      </form>
    </GlassCard>
  );
};

export default SessionFeedbackForm;