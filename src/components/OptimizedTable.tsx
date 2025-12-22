import React, { memo } from 'react';
import { Table } from 'antd';

interface OptimizedTableProps {
    columns: any[];
    dataSource: any[];
    loading?: boolean;
    pagination?: any;
    expandable?: any;
    rowKey?: string | ((record: any) => string);
    onRow?: (record: any) => any;
    rowClassName?: (record: any) => string;
}

const OptimizedTable: React.FC<OptimizedTableProps> = memo(({
    columns,
    dataSource,
    loading = false,
    pagination,
    expandable,
    rowKey = 'key',
    onRow,
    rowClassName
}) => {
    return (
        <Table
            columns={columns}
            dataSource={dataSource}
            loading={loading}
            pagination={pagination}
            expandable={expandable}
            rowKey={rowKey}
            onRow={onRow}
            rowClassName={rowClassName}
            // Optimización: scrolling virtual para listas grandes
            scroll={{ y: 'calc(100vh - 400px)' }}
        />
    );
}, (prevProps, nextProps) => {
    // Comparación personalizada para evitar re-renders
    return (
        prevProps.dataSource === nextProps.dataSource &&
        prevProps.loading === nextProps.loading &&
        prevProps.columns === nextProps.columns
    );
});

OptimizedTable.displayName = 'OptimizedTable';

export default OptimizedTable;
