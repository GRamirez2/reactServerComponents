'use client';

import { useState, useEffect } from 'react';
import { Specialty } from '@/lib/repositories/specialtiesRepository';
import { EditSpecialtyModal } from './_components/EditSpecialtyModal';
import { CreateSpecialtyModal } from './_components/CreateSpecialtyModal';
import { getSpecialties } from './_actions/getSpecialties';

export default function AdminSpecialtiesPage() {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSpecialty, setSelectedSpecialty] = useState<Specialty | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createToastMessage, setCreateToastMessage] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const loadSpecialties = async () => {
      try {
        const data = await getSpecialties();
        setSpecialties(data);
      } catch (error) {
        console.error('Failed to load specialties:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSpecialties();
  }, []);

  useEffect(() => {
    if (!createToastMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCreateToastMessage(null);
    }, 4500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [createToastMessage]);

  const handleEditClick = (specialty: Specialty) => {
    setSelectedSpecialty(specialty);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedSpecialty(null);
  };

  const handleCreateModalClose = () => {
    setIsCreateModalOpen(false);
  };

  const handleEditSuccess = (updated: Specialty) => {
    setSpecialties(specialties.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleDeleteSuccess = () => {
    setSpecialties(specialties.filter((s) => s.id !== selectedSpecialty?.id));
    handleModalClose();
  };

  const handleCreateSuccess = (created: Specialty) => {
    setSpecialties((current) =>
      [...current, created].sort((a, b) =>
        a.category.localeCompare(b.category),
      ),
    );
    setCreateToastMessage(`Created specialty: ${created.category}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold">
            Specialties ({specialties.length})
          </h3>
          <p>Manage specialties.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="self-start rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Create New Specialty
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-300">
          <thead className="bg-gray-100 text-gray-900">
            <tr>
              <th className="border border-gray-300 px-4 py-2 text-left">ID</th>
              <th className="border border-gray-300 px-4 py-2 text-left">
                Code Range
              </th>
              <th className="border border-gray-300 px-4 py-2 text-left">
                Category
              </th>
              <th className="border border-gray-300 px-4 py-2 text-left">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {specialties.map((specialty) => (
              <tr
                key={specialty.id}
                className="hover:bg-gray-50 hover:text-gray-900"
              >
                <td className="border border-gray-300 px-4 py-2">
                  {specialty.id}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {specialty.codeRange}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {specialty.category}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <button
                    onClick={() => handleEditClick(specialty)}
                    className="text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && specialties.length === 0 && (
          <p className="text-gray-500 mt-4">No specialties found.</p>
        )}
        {isLoading && <p className="text-gray-500 mt-4">Loading...</p>}
      </div>

      {selectedSpecialty && (
        <EditSpecialtyModal
          specialty={selectedSpecialty}
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSuccess={handleEditSuccess}
          onDelete={handleDeleteSuccess}
        />
      )}

      <CreateSpecialtyModal
        isOpen={isCreateModalOpen}
        onClose={handleCreateModalClose}
        onSuccess={handleCreateSuccess}
      />

      {createToastMessage && (
        <div
          className="fixed right-6 top-20 z-20 max-w-md rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-lg"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">Success</p>
              <p className="mt-1">{createToastMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => setCreateToastMessage(null)}
              className="rounded px-2 py-1 text-xs font-semibold uppercase tracking-wide opacity-70 transition hover:opacity-100"
              aria-label="Dismiss toast"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
