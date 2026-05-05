import React from 'react';
import { Button } from 'antd';

interface Props {
  loading: boolean;
  isSeller: boolean;
  onCancel: () => void;
}

const ActionButtons: React.FC<Props> = ({ loading, isSeller, onCancel }) => {
  if (isSeller) return null;

  return (
    <div className="flex justify-center gap-2">
      <Button type="primary" htmlType="submit" loading={loading}>
        {loading ? 'Guardando...' : 'Guardar'}
      </Button>
      <Button onClick={onCancel}>Cancelar</Button>
    </div>
  );
};

export default ActionButtons;
