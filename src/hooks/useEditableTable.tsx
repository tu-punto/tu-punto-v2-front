import { useState, useEffect, useRef } from 'react';

const useEditableTable = (initialData: any) => {
    const [data, setData] = useState(initialData);
    const prevInitialDataRef = useRef(initialData)


    useEffect(() => {
        if (JSON.stringify(prevInitialDataRef.current) !== JSON.stringify(initialData)) {
            setData((prevData: any) => {
                const newItems = initialData.filter((newItem: any) =>
                    !prevData.some((existingItem: any) => existingItem.key === newItem.key)
                );
                return [...prevData, ...newItems];
            });
            prevInitialDataRef.current = initialData;
        }
    }, [initialData]);

    const handleValueChange = (key: any, field: any, value: any) => {
        const newData = data.map((item: any) => {
            if (item.key === key) {
                return { ...item, [field]: value };
            }
            return item;
        });
        setData(newData);
    };

    return [data, setData, handleValueChange];
};

export default useEditableTable;
