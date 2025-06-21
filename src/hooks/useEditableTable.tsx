import { useState, useEffect, useRef } from "react";

const useEditableTable = (initialData: any) => {
  const [data, setData] = useState(initialData);
  const prevInitialDataRef = useRef(initialData);

  useEffect(() => {
    if (
      JSON.stringify(prevInitialDataRef.current) !== JSON.stringify(initialData)
    ) {
      setData((prevData: any) => {
        const newItems = initialData.filter(
          (newItem: any) =>
            !prevData.some(
              (existingItem: any) => existingItem.key === newItem.key
            )
        );
        return [...prevData, ...newItems];
      });
      prevInitialDataRef.current = initialData;
    }
  }, [initialData]);

  const handleValueChange = (key: any, field: any, value: any) => {
    setData((prevData: any) => {
      const newData = prevData.map((item: any) => {
        if (item.key === key) {
          const updates = { ...item, [field]: value };

          // Handle cantidad updates
          if (field === "cantidad" && item.utilidad) {
            const utilidadPerUnit = item.utilidad / item.cantidad;
            updates.utilidad = Number((utilidadPerUnit * value).toFixed(2));
          }

          return updates;
        }
        return item;
      });
      return newData;
    });
  };

  return [data, setData, handleValueChange];
};

export default useEditableTable;
