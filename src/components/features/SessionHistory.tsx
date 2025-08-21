'use client';

import React, { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { GlassSelect } from '@/components/ui/GlassSelect';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

interface SessionHistoryProps {
  userId: string;
  className?: string;
}

interface SessionHistoryFilters {
  search: string;
  sessionType: string;
  dateFrom: string;
  dateTo: string;
  minRating: string;
  partnerId: string;
  topics: string;
}

interface SessionRecord {
  id: string;
  initiatorId: string;
  partnerId: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  sessionType: string;
  topics: string[];
  ratingInitiator: number | null;
  ratingPartner: number | null;
  feedbackInitiator: string | null;
  feedbackPartner: string | null;
  status: string;
  initiator: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
  partner: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
}

export const SessionHistory: React.FC<SessionHistoryProps> = ({
  userId,
  className = ''
}) => {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SessionHistoryFilters>({
    search: '',
    sessionType: '',
    dateFrom: '',
    dateTo: '',
    minRating: '',
    partnerId: '',
    topics: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchSessionHistory();
  }, [userId, filters, pagination.page]);

  const fetchSessionHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.sessionType && { sessionType: filters.sessionType }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo }),
        ...(filters.minRating && { minRating: filters.minRating }),
        ...(filters.partnerId && { partnerId: filters.partnerId }),
        ...(filters.topics && { topics: filters.topics })
      });

      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/sessions/history?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch session history');
      }

      const data = await response.json();
      setSessions(data.data);
      setPagination(prev => ({
        ...prev,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages,
        hasNext: data.pagination.hasNext,
        hasPrev: data.pagination.hasPrev
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof SessionHistoryFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      sessionType: '',
      dateFrom: '',
      dateTo: '',
      minRating: '',
      partnerId: '',
      topics: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUserRating = (session: SessionRecord): number | null => {
    return session.initiatorId === userId
      ? session.ratingInitiator
      : session.ratingPartner;
  };

  const getPartnerInfo = (session: SessionRecord) => {
    return session.initiatorId === userId ? session.partner : session.initiator;
  };

  if (loading && sessions.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        <LoadingSkeleton className="h-16" />
        {Array.from({ length: 5 }).map((_, i) => (
          <LoadingSkeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-white">Session History</h2>
        <div className="flex gap-2">
          <GlassButton
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </GlassButton>
          <GlassButton
            variant="ghost"
            size="sm"
            onClick={fetchSessionHistory}
          >
            Refresh
          </GlassButton>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <GlassCard className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <GlassInput
              placeholder="Search sessions..."
              value={filters.search}
              onChange={(value) => handleFilterChange('search', value)}
            />
            <GlassSelect
              value={filters.sessionType}
              onChange={(value) => handleFilterChange('sessionType', value)}
              options={[
                { value: '', label: 'All session types' },
                { value: 'learning', label: 'Learning' },
                { value: 'teaching', label: 'Teaching' },
                { value: 'collaboration', label: 'Collaboration' }
              ]}
            />
            <GlassSelect
              value={filters.minRating}
              onChange={(value) => handleFilterChange('minRating', value)}
              options={[
                { value: '', label: 'All ratings' },
                { value: '5', label: '5 stars only' },
                { value: '4', label: '4+ stars' },
                { value: '3', label: '3+ stars' },
                { value: '2', label: '2+ stars' },
                { value: '1', label: '1+ stars' }
              ]}
            />
            <GlassInput
              type="date"
              placeholder="From date"
              value={filters.dateFrom}
              onChange={(value) => handleFilterChange('dateFrom', value)}
            />
            <GlassInput
              type="date"
              placeholder="To date"
              value={filters.dateTo}
              onChange={(value) => handleFilterChange('dateTo', value)}
            />
            <GlassInput
              placeholder="Topics (comma-separated)"
              value={filters.topics}
              onChange={(value) => handleFilterChange('topics', value)}
            />
          </div>
          <div className="flex justify-end mt-4">
            <GlassButton variant="ghost" size="sm" onClick={clearFilters}>
              Clear Filters
            </GlassButton>
          </div>
        </GlassCard>
      )}

      {/* Error State */}
      {error && (
        <GlassCard className="p-6">
          <div className="text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <GlassButton onClick={fetchSessionHistory}>
              Try Again
            </GlassButton>
          </div>
        </GlassCard>
      )}

      {/* Session List */}
      {!error && (
        <div className="space-y-4">
          {sessions.length === 0 ? (
            <GlassCard className="p-8">
              <div className="text-center">
                <p className="text-gray-400 mb-2">No sessions found</p>
                <p className="text-sm text-gray-500">
                  {Object.values(filters).some(f => f)
                    ? 'Try adjusting your filters'
                    : 'Complete your first session to see it here'
                  }
                </p>
              </div>
            </GlassCard>
          ) : (
            sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                userId={userId}
                onViewDetails={(sessionId) => {
                  // Handle view details - could open a modal or navigate
                  console.log('View details for session:', sessionId);
                }}
              />
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-4">
          <GlassButton
            variant="ghost"
            size="sm"
            disabled={!pagination.hasPrev}
            onClick={() => handlePageChange(pagination.page - 1)}
          >
            Previous
          </GlassButton>

          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const pageNum = i + 1;
              const isCurrentPage = pageNum === pagination.page;

              return (
                <GlassButton
                  key={pageNum}
                  variant={isCurrentPage ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </GlassButton>
              );
            })}
          </div>

          <GlassButton
            variant="ghost"
            size="sm"
            disabled={!pagination.hasNext}
            onClick={() => handlePageChange(pagination.page + 1)}
          >
            Next
          </GlassButton>
        </div>
      )}

      {/* Results Summary */}
      <div className="text-center text-sm text-gray-400">
        Showing {sessions.length} of {pagination.total} sessions
      </div>
    </div>
  );
};

// Session Card Component
const SessionCard: React.FC<{
  session: SessionRecord;
  userId: string;
  onViewDetails: (sessionId: string) => void;
}> = ({ session, userId, onViewDetails }) => {
  const partner = session.initiatorId === userId ? session.partner : session.initiator;
  const userRating = session.initiatorId === userId
    ? session.ratingInitiator
    : session.ratingPartner;
  const partnerRating = session.initiatorId === userId
    ? session.ratingPartner
    : session.ratingInitiator;

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <GlassCard className="p-6 hover:bg-white/10 transition-colors">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Session Info */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {/* Partner Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
              {partner.avatarUrl ? (
                <img
                  src={partner.avatarUrl}
                  alt={partner.username}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                partner.username.charAt(0).toUpperCase()
              )}
            </div>

            {/* Session Details */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-white">{partner.username}</h3>
                <span className={`px-2 py-1 rounded text-xs font-medium ${session.sessionType === 'learning' ? 'bg-blue-500/20 text-blue-300' :
                    session.sessionType === 'teaching' ? 'bg-green-500/20 text-green-300' :
                      'bg-purple-500/20 text-purple-300'
                  }`}>
                  {session.sessionType}
                </span>
              </div>
              <p className="text-sm text-gray-400">
                {formatDate(session.startTime)} • {formatDuration(session.durationMinutes)}
              </p>
            </div>
          </div>

          {/* Topics */}
          {session.topics.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {session.topics.slice(0, 3).map((topic, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-white/10 text-gray-300 rounded text-xs"
                >
                  {topic}
                </span>
              ))}
              {session.topics.length > 3 && (
                <span className="px-2 py-1 bg-white/10 text-gray-300 rounded text-xs">
                  +{session.topics.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Ratings and Actions */}
        <div className="flex items-center gap-4">
          {/* Ratings */}
          <div className="flex items-center gap-3">
            {userRating && (
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">Your rating</p>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <span
                      key={i}
                      className={`text-sm ${i < userRating ? 'text-yellow-400' : 'text-gray-600'
                        }`}
                    >
                      ⭐
                    </span>
                  ))}
                </div>
              </div>
            )}

            {partnerRating && (
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">Partner rating</p>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <span
                      key={i}
                      className={`text-sm ${i < partnerRating ? 'text-yellow-400' : 'text-gray-600'
                        }`}
                    >
                      ⭐
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <GlassButton
            variant="ghost"
            size="sm"
            onClick={() => onViewDetails(session.id)}
          >
            View Details
          </GlassButton>
        </div>
      </div>
    </GlassCard>
  );
};

export default SessionHistory;