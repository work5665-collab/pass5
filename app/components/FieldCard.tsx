'use client';
import { useFieldInteraction } from '@/lib/hooks/useFieldInteraction';

export default function FieldCard({
  field,
  cardStore,
  fieldModes,
  getFieldOptions,
  handleSelectChange,
}: {
  field: any;
  cardStore: Record<string, any>;
  fieldModes: Record<string, string>;
  getFieldOptions: (f: any, cardId: string) => string[];
  handleSelectChange: (fid: string, val: string, cid: string) => void;
}) {
  const currentVal = Array.isArray(cardStore[field.id]) ? (cardStore[field.id][0] || '') : (cardStore[field.id] || '');
  const optionsList = getFieldOptions(field, '');
  const fieldMode = fieldModes[field.id] || 'SELECT';
  return (
    <div key={field.id}>
      <select
        value={fieldMode === 'CUSTOM' ? 'CUSTOM_MODE' : (optionsList.includes(currentVal) ? currentVal : '')}
        onChange={(e) => handleSelectChange(field.id, e.target.value, '')}
      >
        <option value="">--- 보기 중 하나를 선택하세요 ---</option>
      </select>
    </div>
  );
}
