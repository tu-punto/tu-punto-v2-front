import { Select, Input, Button, Form, Row, Col, Collapse, Space} from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { getCategoriesAPI } from '../../api/category';
import { getSucursalsAPI } from '../../api/sucursal';
import { Option } from 'antd/es/mentions';
import { getFeaturesAPI } from '../../api/feature';
const { Panel } = Collapse;

const ProductSearcher = ( {applySearcher} ) => {

    const [form] = Form.useForm()
    const [attributes, setAttributes] = useState([{ key: '', value: '' }]);
    const [cateogries, setCategories] = useState([])
    const [sucursals, setSucursals] = useState([])
    const [features, setFeatures] = useState([])
    const [available, setAvialable] = useState([])

    const handleAddAttribute = () => {
        setAttributes([...attributes, { key: '', value: '' }]);
    };

    const handleRemoveAttribute = (index: number) => {
        const newAttributes = attributes.filter((_, i) => i !== index);
        setAttributes(newAttributes);
    };

    const resetSearcher = () => {
        setAttributes([{ key: '', value: '' }]);
        form.resetFields(); 
        applySearcher(
            {
                nombre_producto: null,
                id_categoria: null,
                sucursal: null,
                features: null
            }
        )
    }

    const getSearcher = () => {
        const values = form.getFieldsValue()

        const filteredAttributes = attributes.filter(attr => attr.key)

        const criteria = {
            nombre_producto: values.name,
            id_categoria: values.category,
            sucursal: values.sucursal,
            features: filteredAttributes
        }
        applySearcher(criteria)
    }

    const fetchData = async () => {
        const categoriesResponse = await getCategoriesAPI()
        const sucursalResponse = await getSucursalsAPI()
        const featuresResponse = await getFeaturesAPI()

        const uniqueFeatures = [...new Set(featuresResponse.map(feature => feature.feature))]

        setCategories(categoriesResponse)
        setSucursals(sucursalResponse)
        setFeatures(uniqueFeatures)
        setAvialable(uniqueFeatures)
    }

    useEffect(() => {
        fetchData()
    },[])

    return (
        <Collapse accordion style={{margin: 20, marginTop:30}}>
            <Panel header="Buscador" key={1}>
                <Form layout="vertical" form={form}>
                    <Row gutter={[16,16]}>
                        <Col xs={24} sm={12} lg={8}>
                        <Form.Item name="category" label="Categoría">
                            <Select showSearch placeholder="Selecciona una categoría"
                                    filterOption={(input, option: any) =>
                                        option.key.toLocaleLowerCase().includes(input.toLocaleLowerCase())}
                                    >
                                {
                                    cateogries.map((category) => (
                                        <Option key={category.categoria} 
                                                value={category.id_categoria}
                                        >
                                             {category.categoria}
                                        </Option>
                                    ))
                                }
                            </Select>
                        </Form.Item>
                        </Col>

                        <Col xs={24} sm={12} lg={8}>
                        <Form.Item name="sucursal" label="Sucursal">
                            <Select showSearch placeholder="Selecciona una sucursal"
                                    filterOption={(input, option: any) =>
                                        option.key.toLocaleLowerCase().includes(input.toLocaleLowerCase())}
                            >
                                {
                                    sucursals.map((sucursal) => (
                                        <Option key={sucursal.nombre} 
                                                value={sucursal.id_sucursal}
                                        >
                                             {sucursal.nombre}
                                        </Option>
                                    ))
                                }
                            </Select>
                        </Form.Item>
                        </Col>

                        <Col xs={24} sm={12} lg={8}>
                        <Form.Item name="name" label="Nombre del Producto">
                            <Input placeholder="Ingresa el nombre del producto" />
                        </Form.Item>
                        </Col>
                    </Row>
                    
                    <Row className='mb-4'>
                        <Col xs={0} sm={12} lg={8}>
                            Caracteristica
                        </Col>
                        <Col xs={0} sm={12} lg={8}>
                            Valor
                        </Col>
                        <Col xs={24} sm={0} lg={0}>
                            Caracteristicas
                        </Col>
                    </Row>

                    {attributes.map((attribute, index) => (
                        <Row key={index} gutter={[16,16]} align={"middle"}>
                        <Col xs={24} sm={12} lg={8}>
                            <Form.Item className='mb-2'>
                                <Select showSearch placeholder="Selecciona una característica" 
                                 onChange={value => {
                                    const newAttributes = [...attributes];
                                    newAttributes[index].key = value;
                                    setAttributes(newAttributes);
                                }}
                                filterOption={(input, option: any) =>
                                    option.value.toLocaleLowerCase().includes(input.toLocaleLowerCase())}
                                >
                                    {
                                        available.map((feature, index) => (
                                            <Option key={index} 
                                                    value={feature}
                                            >
                                                {feature}
                                            </Option>
                                        ))
                                    }
                                </Select>
                            </Form.Item>
                        </Col>

                        <Col xs={24} sm={12} lg={8}>
                            <Form.Item className="mb-2" name={attribute.key}>
                                <Input placeholder="Ingresa un valor" value={attribute.value} onChange={e => {
                                    const newAttributes = [...attributes];
                                    newAttributes[index].value = e.target.value;
                                    setAttributes(newAttributes);
                                }} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} lg={8}>
                            <Button className='mb-3 desktop:flex' onClick={() => handleRemoveAttribute(index)}>
                                <DeleteOutlined/>
                            </Button>
                        </Col>
                        </Row>
                    ))}

                    <Row className="mt-2" justify="space-between" align="middle">
                        <Col className="mobile:mb-4 sm:mb-0" xs={24} sm={12}>
                            <Button onClick={handleAddAttribute}>Agregar Característica</Button>
                        </Col>
                        <Col className="mobile:text-start tablet:text-end" xs={24} sm={12} >
                            <Space className='w-full'>
                                <Button onClick={resetSearcher}>Reset</Button>
                                <Button onClick={getSearcher}>Apply</Button>
                            </Space>
                        </Col>
                    </Row>

                </Form> 
            </Panel>
        </Collapse>    
    );
};

export default ProductSearcher;
