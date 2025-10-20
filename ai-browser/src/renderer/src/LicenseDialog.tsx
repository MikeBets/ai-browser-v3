import React, { useState } from 'react';

interface LicenseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onActivate: (licenseKey: string) => Promise<{ success: boolean; error?: string }>;
}

const LicenseDialog: React.FC<LicenseDialogProps> = ({ isOpen, onClose, onActivate }) => {
  const [licenseKey, setLicenseKey] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [activationMessage, setActivationMessage] = useState('');

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      setActivationMessage('请输入许可证密钥');
      return;
    }

    setIsActivating(true);
    setActivationMessage('');

    try {
      const result = await onActivate(licenseKey.trim());
      if (result.success) {
        setActivationMessage('🎉 许可证激活成功！');
        setLicenseKey('');
        setTimeout(() => {
          onClose();
          // Reload the app to apply license changes
          window.location.reload();
        }, 2000);
      } else {
        setActivationMessage(`❌ 激活失败：${result.error}`);
      }
    } catch (error) {
      setActivationMessage('❌ 激活失败：网络错误，请稍后重试');
    } finally {
      setIsActivating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isActivating) {
      handleActivate();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="license-dialog-overlay">
      <div className="license-dialog">
        <div className="license-dialog-header">
          <h2>🔑 激活许可证</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>

        <div className="license-dialog-body">
          <p>请输入您的许可证密钥以激活 AI 浏览器专业版功能。</p>

          <div className="license-input-group">
            <label htmlFor="license-key">许可证密钥：</label>
            <input
              id="license-key"
              type="text"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="例如：ABCDEF-123456-GHIJKL"
              disabled={isActivating}
              className="license-input"
            />
          </div>

          {activationMessage && (
            <div className={`activation-message ${activationMessage.includes('成功') ? 'success' : 'error'}`}>
              {activationMessage}
            </div>
          )}

          <div className="license-dialog-footer">
            <button
              onClick={handleActivate}
              disabled={isActivating || !licenseKey.trim()}
              className="activate-button"
            >
              {isActivating ? '🔄 激活中...' : '✅ 激活许可证'}
            </button>
            <button onClick={onClose} disabled={isActivating} className="cancel-button">
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LicenseDialog;
