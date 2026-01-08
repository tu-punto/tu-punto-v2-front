import { useEffect, useState } from "react";
import CardSection from "../../../components/CardSection";

interface SalesSectionProps {
    branchID: string | null
}

function SalesSection({branchID} : SalesSectionProps) {
    const [loading, setLoading] = useState(false)
    const [selectedProducts, setSelectedProducts] = useState([])
    const [totalAmount, setTotalAmount] = useState(0)

    useEffect(() => {
        setLoading(false)
        setSelectedProducts([])
        setTotalAmount(0)
    }, [branchID])

    return (
        <CardSection
            title="Ventas"
        >
            <></>
        </CardSection>
    );
}

export default SalesSection;