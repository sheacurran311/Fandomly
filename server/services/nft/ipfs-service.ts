/**
 * IPFS Service — Pinata integration for NFT metadata storage.
 *
 * Handles:
 *   - Image uploads (JPEG, PNG, GIF, WebP, SVG)
 *   - Video uploads (MP4, WebM, MOV)
 *   - JSON metadata uploads (ERC-721 / ERC-1155 standard)
 *   - Metadata builder that generates proper IPFS URIs
 *
 * Avalanche-specific: metadata files must NOT have .json extension
 * per Avalanche Academy guidance (breaks tokenURI resolution on some indexers).
 */

// @ts-expect-error - pinata-web3 types may not be installed
import { PinataSDK } from 'pinata-web3';

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export interface NFTAttribute {
  trait_type: string;
  value: string | number;
  display_type?: string;
}

export interface NFTMetadata {
  name: string;
  description: string;
  image: string; // ipfs://Qm... or gateway URL
  animation_url?: string; // For video NFTs
  external_url?: string;
  attributes?: NFTAttribute[];
  properties?: Record<string, unknown>;
}

export interface UploadResult {
  ipfsHash: string;
  ipfsUri: string; // ipfs://Qm...
  gatewayUrl: string; // https://gateway.pinata.cloud/ipfs/Qm...
  size?: number;
}

// ────────────────────────────────────────────────────────────────────────────
// Service
// ────────────────────────────────────────────────────────────────────────────

export class IPFSService {
  private pinata: PinataSDK;
  private gateway: string;

  constructor(jwt: string, gateway?: string) {
    this.pinata = new PinataSDK({ pinataJwt: jwt });
    this.gateway = gateway || 'https://gateway.pinata.cloud';
  }

  // ── File Uploads ──────────────────────────────────────────────────────

  /**
   * Upload an image buffer to IPFS via Pinata.
   * Returns the IPFS hash and URI.
   */
  async uploadImage(buffer: Buffer, filename: string, mimeType: string): Promise<UploadResult> {
    const file = new File([buffer], filename, { type: mimeType });

    const result = await this.pinata.upload.file(file).addMetadata({
      name: filename,
      keyValues: { type: 'nft-image' } as Record<string, string>,
    });

    return {
      ipfsHash: result.IpfsHash,
      ipfsUri: `ipfs://${result.IpfsHash}`,
      gatewayUrl: `${this.gateway}/ipfs/${result.IpfsHash}`,
      size: result.PinSize,
    };
  }

  /**
   * Upload a video buffer to IPFS via Pinata.
   */
  async uploadVideo(buffer: Buffer, filename: string, mimeType: string): Promise<UploadResult> {
    const file = new File([buffer], filename, { type: mimeType });

    const result = await this.pinata.upload.file(file).addMetadata({
      name: filename,
      keyValues: { type: 'nft-video' } as Record<string, string>,
    });

    return {
      ipfsHash: result.IpfsHash,
      ipfsUri: `ipfs://${result.IpfsHash}`,
      gatewayUrl: `${this.gateway}/ipfs/${result.IpfsHash}`,
      size: result.PinSize,
    };
  }

  // ── Metadata Upload ───────────────────────────────────────────────────

  /**
   * Upload ERC-721/1155 JSON metadata to IPFS.
   * File is named without .json extension (Avalanche best practice).
   */
  async uploadMetadata(metadata: NFTMetadata, name?: string): Promise<UploadResult> {
    const result = await this.pinata.upload.json(metadata).addMetadata({
      name: name || metadata.name,
      keyValues: { type: 'nft-metadata' } as Record<string, string>,
    });

    return {
      ipfsHash: result.IpfsHash,
      ipfsUri: `ipfs://${result.IpfsHash}`,
      gatewayUrl: `${this.gateway}/ipfs/${result.IpfsHash}`,
      size: result.PinSize,
    };
  }

  // ── Metadata Builder ──────────────────────────────────────────────────

  /**
   * Build standard ERC-721 metadata for an image NFT,
   * upload the image first, then the metadata JSON.
   */
  async buildAndUploadImageNFT(params: {
    name: string;
    description: string;
    imageBuffer: Buffer;
    imageFilename: string;
    imageMimeType: string;
    attributes?: NFTAttribute[];
    externalUrl?: string;
  }): Promise<{ image: UploadResult; metadata: UploadResult; metadataJson: NFTMetadata }> {
    // 1. Upload image
    const image = await this.uploadImage(
      params.imageBuffer,
      params.imageFilename,
      params.imageMimeType
    );

    // 2. Build metadata
    const metadataJson: NFTMetadata = {
      name: params.name,
      description: params.description,
      image: image.ipfsUri,
      attributes: params.attributes || [],
    };
    if (params.externalUrl) metadataJson.external_url = params.externalUrl;

    // 3. Upload metadata
    const metadata = await this.uploadMetadata(metadataJson, params.name);

    return { image, metadata, metadataJson };
  }

  /**
   * Build standard ERC-721 metadata for a video NFT.
   * `image` field is set to a thumbnail, `animation_url` to the video.
   */
  async buildAndUploadVideoNFT(params: {
    name: string;
    description: string;
    videoBuffer: Buffer;
    videoFilename: string;
    videoMimeType: string;
    thumbnailBuffer: Buffer;
    thumbnailFilename: string;
    thumbnailMimeType: string;
    attributes?: NFTAttribute[];
    externalUrl?: string;
  }): Promise<{
    thumbnail: UploadResult;
    video: UploadResult;
    metadata: UploadResult;
    metadataJson: NFTMetadata;
  }> {
    // 1. Upload thumbnail and video in parallel
    const [thumbnail, video] = await Promise.all([
      this.uploadImage(params.thumbnailBuffer, params.thumbnailFilename, params.thumbnailMimeType),
      this.uploadVideo(params.videoBuffer, params.videoFilename, params.videoMimeType),
    ]);

    // 2. Build metadata
    const metadataJson: NFTMetadata = {
      name: params.name,
      description: params.description,
      image: thumbnail.ipfsUri,
      animation_url: video.ipfsUri,
      attributes: params.attributes || [],
    };
    if (params.externalUrl) metadataJson.external_url = params.externalUrl;

    // 3. Upload metadata
    const metadata = await this.uploadMetadata(metadataJson, params.name);

    return { thumbnail, video, metadata, metadataJson };
  }

  /**
   * Build ERC-1155 badge metadata (image-only, with badge-specific attributes).
   */
  async buildAndUploadBadge(params: {
    name: string;
    description: string;
    imageBuffer: Buffer;
    imageFilename: string;
    imageMimeType: string;
    category: string;
    soulbound: boolean;
    creatorName?: string;
  }): Promise<{ image: UploadResult; metadata: UploadResult; metadataJson: NFTMetadata }> {
    const attributes: NFTAttribute[] = [
      { trait_type: 'Category', value: params.category },
      { trait_type: 'Soulbound', value: params.soulbound ? 'Yes' : 'No' },
      { trait_type: 'Platform', value: 'Fandomly' },
    ];
    if (params.creatorName) {
      attributes.push({ trait_type: 'Creator', value: params.creatorName });
    }

    return this.buildAndUploadImageNFT({
      name: params.name,
      description: params.description,
      imageBuffer: params.imageBuffer,
      imageFilename: params.imageFilename,
      imageMimeType: params.imageMimeType,
      attributes,
      externalUrl: 'https://fandomly.com',
    });
  }

  /**
   * Upload metadata from a pre-built URL (re-pin existing content).
   */
  async uploadMetadataFromUrl(
    imageUrl: string,
    metadata: NFTMetadata
  ): Promise<{ metadata: UploadResult; metadataJson: NFTMetadata }> {
    // If image is already an IPFS URI, use it directly
    const metadataJson: NFTMetadata = {
      ...metadata,
      image: imageUrl.startsWith('ipfs://') ? imageUrl : metadata.image,
    };

    const result = await this.uploadMetadata(metadataJson, metadata.name);
    return { metadata: result, metadataJson };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Singleton
// ────────────────────────────────────────────────────────────────────────────

let ipfsService: IPFSService | null = null;

export function initializeIPFSService(): IPFSService | null {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    console.warn('IPFS Service not configured. Set PINATA_JWT in env.');
    return null;
  }

  const gateway = process.env.PINATA_GATEWAY || 'https://gateway.pinata.cloud';
  ipfsService = new IPFSService(jwt, gateway);
  console.log('IPFS Service initialized (Pinata)');
  return ipfsService;
}

export function getIPFSService(): IPFSService | null {
  if (!ipfsService) {
    return initializeIPFSService();
  }
  return ipfsService;
}
