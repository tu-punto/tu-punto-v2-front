import { ReactNode } from "react";
import { Card, Col, Row, Space, Typography } from "antd";

interface CardSectionProps {
    title: String,
    actions?: ReactNode,
    children: ReactNode
}

function CardSection({ title, actions, children }: CardSectionProps) {
    return (
        <Card
            bordered={false}
            title={
                <Row justify="space-between" align="middle" gutter={[8, 8]}>
                    <Col>
                        <Typography.Text className="text-mobile-base xl:text-desktop-sm ">
                            {title}
                        </Typography.Text>
                    </Col>
                    <Col>
                        <Space wrap>
                            {actions}
                        </Space>
                    </Col>
                </Row>
            }
        >
            {children}
        </Card>
    );
}

export default CardSection;