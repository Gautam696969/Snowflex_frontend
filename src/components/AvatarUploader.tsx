import { useState, useRef, type ChangeEvent } from 'react'
import { Camera, Trash2, Check, X, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import UserAvatar from './UserAvatar'

interface AvatarUploaderProps {
  fullName: string
  avatarUrl: string | null
  onUpload: (file: File) => Promise<string>
  onRemove: () => Promise<void>
}

export default function AvatarUploader({
  fullName,
  avatarUrl,
  onUpload,
  onRemove,
}: AvatarUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Allow image MIME types or image file extensions
    const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|svg|bmp|avif|heic|heif|tiff?|ico|jfif)$/i.test(file.name)
    if (!isImage) {
      toast.error('Invalid file type. Please select an image file.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    // 10 MB max size
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10 MB. Please select a smaller photo.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setSelectedFile(file)
    const localUrl = URL.createObjectURL(file)
    setPreviewUrl(localUrl)
  }

  const cancelPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    setSelectedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSaveAvatar = async () => {
    if (!selectedFile) return
    setUploading(true)
    try {
      await onUpload(selectedFile)
      toast.success('Profile photo updated successfully!')
      cancelPreview()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to upload photo.'
      toast.error(msg)
    } finally {
      setUploading(false)
    }
  }

  const handleRemovePhoto = async () => {
    if (!confirm('Are you sure you want to remove your profile photo?')) return
    setRemoving(true)
    try {
      await onRemove()
      toast.success('Profile photo removed.')
      cancelPreview()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to remove photo.'
      toast.error(msg)
    } finally {
      setRemoving(false)
    }
  }

  const currentDisplayUrl = previewUrl || avatarUrl

  return (
    <div className="avatar-uploader-container flex flex-col items-center gap-[12px]">
      <div className="avatar-preview-wrap relative w-[104px] h-[104px] rounded-full border-4 border-white dark:border-[#19231e] shadow-[0_8px_24px_rgba(20,36,29,0.12)] bg-white dark:bg-[#19231e]">
        <UserAvatar name={fullName} avatarUrl={currentDisplayUrl} size={104} className="avatar-initials-large w-full h-full rounded-full flex items-center justify-center text-white text-[36px] font-extrabold tracking-[-0.03em] uppercase" />

        {/* Floating Quick Camera Button */}
        <button
          type="button"
          className="avatar-camera-btn absolute bottom-0 right-0 w-[32px] h-[32px] rounded-full bg-[#193c33] text-[#d9ed74] border-2 border-white flex items-center justify-center cursor-pointer shadow-[0_4px_10px_rgba(0,0,0,0.18)] transition-all duration-150 hover:scale-110 hover:bg-[#14241d] disabled:opacity-50 disabled:cursor-not-allowed"
          title="Choose photo"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || removing}
        >
          <Camera size={16} />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
          aria-label="Upload profile photo"
        />
      </div>

      {/* Action buttons under avatar */}
      <div className="avatar-actions-row flex items-center gap-[8px]">
        {previewUrl ? (
          <div className="avatar-preview-actions flex items-center gap-[8px]">
            <button
              type="button"
              className="primary-action btn-sm inline-flex items-center gap-[6px] px-[12px] py-[6px] text-[12px] font-bold rounded-[8px] bg-[#193c33] dark:bg-[#d9ed74] text-[#d9ed74] dark:text-[#14241d] hover:bg-[#14241d] dark:hover:bg-[#c8dc65] cursor-pointer transition-all disabled:opacity-50"
              onClick={handleSaveAvatar}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 size={13} className="spinning animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check size={13} />
                  Save Photo
                </>
              )}
            </button>
            <button
              type="button"
              className="secondary-action btn-sm inline-flex items-center gap-[6px] px-[12px] py-[6px] text-[12px] font-semibold rounded-[8px] bg-[#f0f4ee] dark:bg-[#202d26] text-[#2c4035] dark:text-[#c4d6cb] hover:bg-[#e4ece1] dark:hover:bg-[#293a31] border border-[#dce2d7] dark:border-[#2b3c33] cursor-pointer transition-all disabled:opacity-50"
              onClick={cancelPreview}
              disabled={uploading}
            >
              <X size={13} />
              Cancel
            </button>
          </div>
        ) : (
          <div className="avatar-standard-actions flex items-center gap-[8px]">
            <button
              type="button"
              className="secondary-action btn-sm inline-flex items-center gap-[6px] px-[12px] py-[6px] text-[12px] font-semibold rounded-[8px] bg-[#f0f4ee] dark:bg-[#202d26] text-[#2c4035] dark:text-[#c4d6cb] hover:bg-[#e4ece1] dark:hover:bg-[#293a31] border border-[#dce2d7] dark:border-[#2b3c33] cursor-pointer transition-all disabled:opacity-50"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || removing}
            >
              <Camera size={13} />
              Change Photo
            </button>
            {avatarUrl && (
              <button
                type="button"
                className="secondary-action btn-sm text-danger inline-flex items-center gap-[6px] px-[12px] py-[6px] text-[12px] font-semibold rounded-[8px] bg-[#f0f4ee] dark:bg-[#202d26] text-[#dc2626] dark:text-[#f87171] hover:bg-[#fee2e2] dark:hover:bg-[#3b1c1c] border border-[#fca5a5] dark:border-[#7f1d1d] cursor-pointer transition-all disabled:opacity-50"
                onClick={handleRemovePhoto}
                disabled={uploading || removing}
                title="Remove photo and use initials"
              >
                {removing ? (
                  <Loader2 size={13} className="spinning animate-spin" />
                ) : (
                  <Trash2 size={13} />
                )}
                Remove
              </button>
            )}
          </div>
        )}
      </div>
      <span className="avatar-guidance text-[10px] text-[#7b8f83] text-center max-w-[160px] leading-[1.3]">
        Allowed formats: Any image format (JPG, PNG, WebP, GIF, SVG, BMP, AVIF, etc. - Max 10 MB)
      </span>
    </div>
  )
}
