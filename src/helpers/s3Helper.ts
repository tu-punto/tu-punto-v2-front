const bucketName = import.meta.env.VITE_AWS_S3_BUCKET_NAME;
const awsRegion = import.meta.env.VITE_AWS_REGION;

export const getSignedURL = async (key: string) => {
    return `https://${bucketName}.s3.${awsRegion}.amazonaws.com/${key}`;
};