
import { Button } from 'antd';
import { generateDeliveredProductsAPI, generatePaymentAPI } from '../../api/googleDrive';

const ProductsPDF = ({products}) => {
    
  const sendToWhats = ({webViewLink}) => {


    // Create the WhatsApp link
    const whatsappLink = `https://wa.me/59170186881?text=${webViewLink}`;

    // Open WhatsApp with the pre-filled message
    window.open(whatsappLink, '_blank');
    
  }

  const generateDeliveredProducts = async () => {
    const fileData = await generateDeliveredProductsAPI(products)
    console.log(fileData)
    sendToWhats(fileData.pdf)
  }
  
  return (
    <div style={{padding: 10}}>
      <Button onClick={generateDeliveredProducts} type='primary'>Generar comprobante de productos</Button>
    </div>
  )
}

export default ProductsPDF