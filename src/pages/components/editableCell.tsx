import { InputNumber, Typography } from "antd";

const { Text } = Typography;

interface EditableCellProps {
    isAdmin: boolean;
    value: number;
    onChange: (value: number) => void;
    min?:number;
}

export const EditableCellInputNumber = ({ isAdmin, value, onChange, min=1 }: EditableCellProps) => {
    const handleChange = (newValue: number | null) => {
        if (newValue !== null && newValue >= min) { 
            onChange(newValue);
          }
    };
    return isAdmin ? (
        <InputNumber
            min={min}
            value={value}
            onChange={handleChange}
            style={{ width: '100%' }}
        />
    ) : (
        <Text>{value}</Text>
    );
};
