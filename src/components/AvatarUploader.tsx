import { useState, useRef, type ChangeEvent } from 'react'
import { Camera, Trash2, Check, X, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { getInitials, getAvatarBackground, getFullAvatarUrl } from '../lib/avatar'

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

    // Allowed mime types
    const validMimes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validMimes.includes(file.type.toLowerCase())) {
      toast.error('Invalid image type. Please select a JPG, PNG, or WebP file.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    // 2 MB max size
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size exceeds 2 MB. Please select a smaller photo.')
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

  const currentDisplayUrl = previewUrl || getFullAvatarUrl(avatarUrl)

  return (
    <div className="avatar-uploader-container">
      <div className="avatar-preview-wrap">
        {currentDisplayUrl ? (
          <img
            src={currentDisplayUrl}
            alt={fullName}
            className="avatar-photo-large"
          />
        ) : (
          <div
            className="avatar-initials-large"
            style={{ background: getAvatarBackground(fullName) }}
            aria-label={fullName}
          >
            {getInitials(fullName)}
          </div>
        )}

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
          accept="image/jpeg,image/png,image/webp"
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
        Allowed formats: JPG, PNG, WebP (Max 2 MB)
      </span>
    </div>
  )
}
