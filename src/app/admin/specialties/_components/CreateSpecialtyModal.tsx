'use client';

import { useState } from 'react';
import { Specialty } from '@/lib/repositories/specialtiesRepository';
import { createSpecialtyAction } from '../_actions/createSpecialty';

interface CreateSpecialtyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (created: Specialty) => void;
}

export function CreateSpecialtyModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateSpecialtyModalProps) {
  const [codeRange, setCodeRange] = useState('');
  const [category, setCategory] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const result = await createSpecialtyAction(codeRange, category);

    if ('error' in result) {
      setError(result.error ?? null);
      setIsLoading(false);
    } else {
      onSuccess(result.specialty);
      handleClose();
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setCodeRange('');
    setCategory('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="admin-surface max-w-md w-full mx-4 border shadow-lg">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold">Create New Specialty</h2>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="admin-label mb-1 block text-sm font-medium">
              Code Range
            </label>
            <input
              type="text"
              value={codeRange}
              onChange={(e) => setCodeRange(e.target.value)}
              className="admin-field px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <label className="admin-label mb-1 block text-sm font-medium">
              Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="admin-field px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
              required
            />
          </div>

          <div className="border-t border-gray-200 pt-4 flex gap-2 justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
