'use client';

import { useState } from 'react';
import { Specialty } from '@/lib/repositories/specialtiesRepository';
import { editSpecialty } from '../_actions/editSpecialty';
import { deleteSpecialtyAction } from '../_actions/deleteSpecialty';

interface EditSpecialtyModalProps {
  specialty: Specialty;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: Specialty) => void;
  onDelete: () => void;
}

export function EditSpecialtyModal({
  specialty,
  isOpen,
  onClose,
  onSuccess,
  onDelete,
}: EditSpecialtyModalProps) {
  const [codeRange, setCodeRange] = useState(specialty.codeRange ?? '');
  const [category, setCategory] = useState(specialty.category ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const result = await editSpecialty(specialty.id, codeRange, category);

    if ('error' in result) {
      setError(result.error ?? null);
      setIsLoading(false);
    } else {
      onSuccess(result.specialty);
      onClose();
    }
  };

  const handleClose = () => {
    setCodeRange(specialty.codeRange ?? '');
    setCategory(specialty.category ?? '');
    setError(null);
    setShowDeleteConfirm(false);
    onClose();
  };

  const handleDelete = async () => {
    setError(null);
    setIsLoading(true);

    const result = await deleteSpecialtyAction(specialty.id);

    if ('error' in result) {
      setError(result.error ?? null);
      setIsLoading(false);
      setShowDeleteConfirm(false);
    } else {
      onDelete();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="admin-surface max-w-md w-full mx-4 border shadow-lg">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold">Edit Specialty</h2>
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

          <div className="border-t border-gray-200 pt-4 flex gap-2 justify-between">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 text-red-600 border border-red-300 rounded hover:bg-red-50"
              disabled={isLoading}
            >
              Delete
            </button>
            <div className="flex gap-2">
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
                {isLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </form>

        {showDeleteConfirm && (
          <div className="border-t border-gray-200 px-6 py-4 bg-red-50">
            <p className="text-sm text-gray-700 mb-4">
              Are you sure you want to delete{' '}
              <strong>{specialty.category}</strong>? This action cannot be
              undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-100"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
                disabled={isLoading}
              >
                {isLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
