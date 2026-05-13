import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { randomUUID } from "crypto"

const ENDPOINT = process.env.S3_ENDPOINT ?? "https://objectstorageapi.cloud.sealos.io"
const BUCKET    = process.env.S3_BUCKET    ?? "1qfqenq8-thinkflow-assets"
const PUBLIC_BASE = process.env.S3_PUBLIC_BASE ?? "https://static-host-1qfqenq8-thinkflow-assets.cloud.sealos.io"
const REGION    = process.env.S3_REGION    ?? "us-east-1"

export const s3 = new S3Client({
  endpoint: ENDPOINT,
  region: REGION,
  credentials: {
    accessKeyId:     process.env.S3_ACCESS_KEY ?? "",
    secretAccessKey: process.env.S3_SECRET_KEY ?? "",
  },
  forcePathStyle: true,
})

export async function uploadBase64Image(
  base64: string,
  folder = "images",
): Promise<string> {
  // 解析 data URL 或纯 base64
  let mimeType = "image/png"
  let data = base64
  const match = base64.match(/^data:([^;]+);base64,(.+)$/)
  if (match) {
    mimeType = match[1]
    data = match[2]
  }

  const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") ?? "png"
  const key = `${folder}/${randomUUID()}.${ext}`
  const body = Buffer.from(data, "base64")

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: mimeType,
    // Public-read ACL（Sealos Public bucket 默认公开，此行可选）
    ACL: "public-read",
  }))

  return `${PUBLIC_BASE}/${key}`
}
