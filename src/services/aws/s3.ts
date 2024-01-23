import S3, { GetObjectRequest, PutObjectRequest } from "aws-sdk/clients/s3";
import path from "path";
import { v4 as uuid } from "uuid";

const bucket = new S3();
const BUCKET_NAME = process.env.BUCKET_NAME;

export const putMedia = async (
  file: any,
  location: string,
  bucketName?: string
) => {
  console.log(file ,"file");
  console.log(location ,"location");
  console.log(bucketName ,"bucketName");
  
  const fileName = uuid() + "-" + Date.now();
  const params: PutObjectRequest = {
    Bucket: `${bucketName ? bucketName : BUCKET_NAME}/${location}`,
    Body: file.buffer,
    Key: `${fileName}.${file.mimetype.split("/")[1]}`,
    ContentType: file.mimetype,
  };
  return await bucket.upload(params).promise();
};

export const listMedia = async (Bucket: string, Location: string) => {
  return await bucket.listObjectsV2({ Bucket, Prefix: Location }).promise();
};

export const getMedia = (filePath: string) => {
  const folderPath = path.dirname(filePath);
  const fileName = path.basename(filePath);
  const params = {
    Bucket: `${BUCKET_NAME}/${folderPath}`,
    Key: fileName,
    Expires: 6 * 24 * 60 * 60,
  };
  return bucket.getSignedUrl("getObject", params);
};
