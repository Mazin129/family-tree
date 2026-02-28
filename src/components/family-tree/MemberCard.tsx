'use client'

import { useState } from 'react'
import { User, Calendar, MapPin, Users, Edit2, Trash2, Plus, X, UsersRound } from 'lucide-react'
import type { TreeMember } from '@/types'
import { GENDER_LABELS, RELATIONSHIP_LABELS_AR, tatweelName } from '@/lib/utils/arabic'
import { cn } from '@/lib/utils/cn'

interface MemberCardProps {
  member: TreeMember
  onEdit?:      (member: TreeMember) => void
  onDelete?:   (memberId: string) => void
  onAddRelative?: (member: TreeMember) => void
  onBulkAdd?:  (member: TreeMember) => void
  /** When true, show optional "Add spouse?" (e.g. when person has children but no spouse) */
  showAddSpousePrompt?: boolean
  onAddSpouse?: (member: TreeMember) => void
  readOnly?: boolean
}

export function MemberCard({
  member,
  onEdit,
  onDelete,
  onAddRelative,
  onBulkAdd,
  showAddSpousePrompt = false,
  onAddSpouse,
  readOnly = false,
}: MemberCardProps) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)

  const displayName = member.fullNameArabic || member.fullName
  const genderLabel = GENDER_LABELS[member.gender]?.ar || ''

  return (
    <div className="card p-5 animate-fade-in" dir="rtl">
      <div className="flex items-start gap-4 mb-4">
        {/* Avatar */}
        <div className={cn(
          'w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shrink-0',
          member.gender === 'MALE'
            ? 'bg-nile-100 text-nile-700'
            : 'bg-sahara-100 text-sahara-700'
        )}>
          {member.photo
            ? <img src={member.photo} alt={displayName} className="w-full h-full object-cover rounded-2xl" />
            : displayName.charAt(0)
          }
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-khartoum-900 text-lg leading-tight">{tatweelName(displayName)}</h3>
              {member.fullName !== member.fullNameArabic && member.fullName && (
                <p className="text-sm text-khartoum-500">{member.fullName}</p>
              )}
            </div>

            {/* Status badge */}
            <span className={cn('badge shrink-0', member.isAlive ? 'badge-green' : 'bg-khartoum-100 text-khartoum-500')}>
              {member.isAlive ? 'حي' : 'توفي'}
            </span>
          </div>

          {/* Lineage */}
          {member.lineage && (
            <p className="text-sm text-sand-700 mt-1 font-medium">{member.lineage}</p>
          )}
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <InfoItem icon={User} label="الجنس" value={genderLabel} />

        {(member.birthYear || member.deathYear) && (
          <InfoItem
            icon={Calendar}
            label={member.isAlive ? 'سنة الميلاد' : 'المدة'}
            value={
              member.birthYear
                ? member.deathYear
                  ? `${member.birthYear} — ${member.deathYear}`
                  : `${member.birthYear}`
                : '—'
            }
          />
        )}

        {member.birthPlace && (
          <InfoItem icon={MapPin} label="مكان الميلاد" value={member.birthPlace} />
        )}

        {member.tribe && (
          <InfoItem icon={Users} label="القبيلة" value={member.tribe} />
        )}

        {member.occupation && (
          <InfoItem
            icon={User}
            label="المهنة"
            value={member.occupationArabic || member.occupation}
          />
        )}
      </div>

      {/* Bio */}
      {(member.bioArabic || member.bio) && (
        <div className="bg-sand-50 rounded-xl p-3 mb-4 border border-sand-100">
          <p className="text-sm text-khartoum-700 leading-relaxed">
            {member.bioArabic || member.bio}
          </p>
        </div>
      )}

      {/* Optional: add spouse when person has children (not mandatory) */}
      {!readOnly && showAddSpousePrompt && onAddSpouse && (
        <div className="mb-4 p-3 rounded-xl bg-sand-50 border border-sand-200">
          <p className="text-xs text-khartoum-500 mb-2">لديه أبناء — إضافة زوج/زوجة اختياري</p>
          <button
            type="button"
            onClick={() => onAddSpouse(member)}
            className="text-sm text-sand-600 hover:text-sand-800 font-medium"
          >
            إضافة زوج/زوجة
          </button>
        </div>
      )}

      {/* Actions */}
      {!readOnly && (
        <div className="flex flex-wrap gap-2 pt-3 border-t border-sand-100">
          {!showConfirmDelete ? (
            <>
              <button
                onClick={() => onAddRelative?.(member)}
                className="btn-primary flex-1 min-w-0 text-sm py-2"
              >
                <Plus className="w-4 h-4" />
                إضافة قريب
              </button>
              {onBulkAdd && (
                <button
                  onClick={() => onBulkAdd(member)}
                  className="btn-secondary px-3 py-2"
                  title="إضافة متعددة"
                >
                  <UsersRound className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => onEdit?.(member)}
                className="btn-secondary px-3 py-2"
                title="تعديل"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowConfirmDelete(true)}
                className="px-3 py-2 rounded-xl text-red-400 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="flex-1 flex items-center gap-2">
              <p className="text-sm text-khartoum-600 flex-1">حذف هذا الشخص؟</p>
              <button onClick={() => { onDelete?.(member.id); setShowConfirmDelete(false) }} className="btn-danger text-sm py-1.5 px-3">
                حذف
              </button>
              <button onClick={() => setShowConfirmDelete(false)} className="btn-ghost text-sm py-1.5 px-3">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-3.5 h-3.5 text-khartoum-400 mt-0.5 shrink-0" />
      <div>
        <div className="text-xs text-khartoum-400">{label}</div>
        <div className="text-sm text-khartoum-800 font-medium">{value}</div>
      </div>
    </div>
  )
}
