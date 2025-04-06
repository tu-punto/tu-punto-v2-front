import { useState } from 'react';

const useEditable = (initialValue: string) => {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(initialValue);
    const [editedValue, setEditedValue] = useState(initialValue);

    const startEditing = () => setIsEditing(true);

    const cancelEditing = () => {
        setEditedValue(value);
        setIsEditing(false);
    };

    const saveEditing = (newValue: string) => {
        setValue(newValue);
        setIsEditing(false);
    };

    return {
        isEditing,
        value,
        editedValue,
        startEditing,
        setEditedValue,
        cancelEditing,
        saveEditing,
    };
};

export default useEditable;
