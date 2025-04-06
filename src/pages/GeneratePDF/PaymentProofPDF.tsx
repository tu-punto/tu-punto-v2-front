
import { Button } from 'antd';
import { generateDeliveredProductsAPI, generatePaymentAPI } from '../../api/googleDrive';

const PaymentProofPDF = ({sellerId}) => {
    
  const sendToWhats = ({webViewLink}) => {


    // Create the WhatsApp link
    const whatsappLink = `https://wa.me/59170186881?text=${webViewLink}`;

    // Open WhatsApp with the pre-filled message
    window.open(whatsappLink, '_blank');
    
  }

  const generateDeliveredProducts = async () => {
    const fileData = await generateDeliveredProductsAPI(sellerId)
    console.log(fileData)
    sendToWhats(fileData.pdf)
  }
  const generatePaymentPDF = async () => {
    const fileData = await generatePaymentAPI(sellerId)
    sendToWhats(fileData.pdf)
  }
  return (
    <div style={{padding: 10}}>
      {/* <Button onClick={generateDeliveredProducts} style={{paddingRight: 10}}>Productos Entregados</Button> */}
      <Button onClick={generatePaymentPDF} 
              type="primary">
                Generar comprobante de pago
      </Button>
    </div>
  )
}

export default PaymentProofPDF