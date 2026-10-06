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
    <div className="avatar-uploader-container">
      <div className="avatar-preview-wrap">
        <UserAvatar name={fullName} avatarUrl={currentDisplayUrl} size={104} className="avatar-initials-large" />

        {/* Floating Quick Camera Button */}
        <button
          type="button"
          className="avatar-camera-btn"
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
      <div className="avatar-actions-row">
        {previewUrl ? (
          <div className="avatar-preview-actions">
            <button
              type="button"
              className="primary-action btn-sm"
              onClick={handleSaveAvatar}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 size={13} className="spinning" />
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
              className="secondary-action btn-sm"
              onClick={cancelPreview}
              disabled={uploading}
            >
              <X size={13} />
              Cancel
            </button>
          </div>
        ) : (
          <div className="avatar-standard-actions">
            <button
              type="button"
              className="secondary-action btn-sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || removing}
            >
              <Camera size={13} />
              Change Photo
            </button>
            {avatarUrl && (
              <button
                type="button"
                className="secondary-action btn-sm text-danger"
                onClick={handleRemovePhoto}
                disabled={uploading || removing}
                title="Remove photo and use initials"
              >
                {removing ? (
                  <Loader2 size={13} className="spinning" />
                ) : (
                  <Trash2 size={13} />
                )}
                Remove
              </button>
            )}
          </div>
        )}
      </div>
      <span className="avatar-guidance">
        Allowed formats: Any image format (JPG, PNG, WebP, GIF, SVG, BMP, AVIF, etc. - Max 10 MB)
      </span>
    </div>
  )
}
