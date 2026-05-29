import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { IconChevronLeft, IconFlaskConical, IconSend } from '@/components/ui/icons';
import { copyToClipboard } from '@/utils/clipboard';
import { useNotificationStore, useAuthStore } from '@/stores';
import { apiKeysApi } from '@/services/api/apiKeys';
import { apiCallApi, getApiCallErrorMessage } from '@/services/api/apiCall';
import sharedStyles from './ModelsListModal.module.scss';

export interface SharedModelItem {
  id: string;
  display_name?: string;
  type?: string;
  isExcluded?: boolean;
}

export interface ModelsListModalProps {
  open: boolean;
  title: string;
  loading?: boolean;
  error?: 'unsupported' | null;
  models: SharedModelItem[];
  onClose: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isError?: boolean;
}

export function ModelsListModal({
  open,
  title,
  loading = false,
  error = null,
  models,
  onClose,
}: ModelsListModalProps) {
  const { t } = useTranslation();
  const showNotification = useNotificationStore((state) => state.showNotification);
  const apiBase = useAuthStore((s) => s.apiBase);

  // Testing workspace states
  const [activeTestModel, setActiveTestModel] = useState<SharedModelItem | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [promptInput, setPromptInput] = useState('Hello');
  const [isRequesting, setIsRequesting] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [tokenUsage, setTokenUsage] = useState<any>(null);
  const [clientApiKey, setClientApiKey] = useState('');

  const chatLogRef = useRef<HTMLDivElement | null>(null);

  // Load client API keys to use as test token
  useEffect(() => {
    if (!open) return;
    const loadKeys = async () => {
      try {
        const keys = await apiKeysApi.list();
        if (keys && keys.length > 0) {
          setClientApiKey(keys[0]);
        }
      } catch (err) {
        console.error('Failed to load api keys', err);
      }
    };
    loadKeys();
  }, [open]);

  // Auto-scroll chat log
  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Reset active model and testing workspace when the modal closes
  useEffect(() => {
    if (!open) {
      setActiveTestModel(null);
    }
  }, [open]);

  // Reset testing workspace when active model changes or modal closes/opens
  useEffect(() => {
    setChatMessages([]);
    setPromptInput('Hello');
    setIsRequesting(false);
    setLatencyMs(null);
    setTokenUsage(null);
  }, [activeTestModel, open]);

  const handleCopy = async (text: string) => {
    const copied = await copyToClipboard(text);
    showNotification(
      copied
        ? t('notification.link_copied', { defaultValue: '已复制到剪贴板' })
        : t('notification.copy_failed', { defaultValue: '复制失败' }),
      copied ? 'success' : 'error'
    );
  };

  const handleSend = async () => {
    if (!promptInput.trim() || isRequesting || !activeTestModel) return;
    if (!clientApiKey) {
      showNotification(t('ai_providers.test_no_api_key'), 'error');
      return;
    }
    const prompt = promptInput.trim();
    setPromptInput('');
    setIsRequesting(true);
    setLatencyMs(null);
    setTokenUsage(null);

    // Save prompt to reference in request
    const newUserMsg: ChatMessage = { role: 'user', content: prompt };
    const currentMessages = [...chatMessages, newUserMsg];
    setChatMessages(currentMessages);

    const assistantMsgIndex = currentMessages.length;

    // Initialize assistant placeholder message in chat log
    setChatMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    const startTime = performance.now();
    try {
      const activeKey = clientApiKey;
      const result = await apiCallApi.request({
        method: 'POST',
        url: `${apiBase}/v1/chat/completions`,
        header: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeKey}`,
        },
        data: JSON.stringify({
          model: activeTestModel.id,
          messages: currentMessages.map((m) => ({ role: m.role, content: m.content })),
          stream: false,
        }),
      });

      if (result.statusCode < 200 || result.statusCode >= 300) {
        throw new Error(getApiCallErrorMessage(result));
      }

      const body = result.body as any;
      const content = body?.choices?.[0]?.message?.content || result.bodyText || '';
      setChatMessages((prev) => {
        const next = [...prev];
        next[assistantMsgIndex] = { role: 'assistant', content };
        return next;
      });
      if (body?.usage) setTokenUsage(body.usage);

      const endTime = performance.now();
      setLatencyMs(endTime - startTime);
    } catch (err: any) {
      setChatMessages((prev) => {
        const next = [...prev];
        next[assistantMsgIndex] = {
          role: 'assistant',
          content: `${err.message || '请求出现异常'}`,
          isError: true,
        };
        return next;
      });
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={activeTestModel ? `${t('ai_providers.test_title')} - ${activeTestModel.id}` : title}
    >
      {activeTestModel ? (
        // Chat / testing workspace view
        <div className={sharedStyles.chatArea}>
          <div className={sharedStyles.testHeader}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setActiveTestModel(null)}
              className={sharedStyles.backButton}
            >
              <IconChevronLeft size={14} />
              <span>{t('ai_providers.test_back')}</span>
            </Button>
            <span className={sharedStyles.testTitle} title={activeTestModel.id}>
              {activeTestModel.id}
            </span>
          </div>

          <div ref={chatLogRef} className={sharedStyles.chatLog}>
            {chatMessages.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: 'var(--text-tertiary)',
                  fontSize: '13px',
                }}
              >
                {t('ai_providers.test_empty_hint')}
              </div>
            ) : (
              chatMessages.map((msg, index) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={index}
                    className={`${sharedStyles.messageRow} ${isUser ? sharedStyles.user : sharedStyles.assistant} ${msg.isError ? sharedStyles.error : ''}`}
                  >
                    <span className={sharedStyles.messageSender}>
                      {isUser ? 'USER' : 'ASSISTANT'}
                    </span>
                    <div className={sharedStyles.messageBubble}>
                      {msg.content === '' && isRequesting && index === chatMessages.length - 1 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <LoadingSpinner size={14} />
                          <span>{t('ai_providers.test_responding')}</span>
                        </div>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className={sharedStyles.inputControls}>
            {(latencyMs !== null || tokenUsage) && (
              <div className={sharedStyles.optionsRow}>
                <div className={sharedStyles.metricsPills}>
                  {latencyMs !== null && (
                    <span className={sharedStyles.pill}>
                      {t('ai_providers.test_latency')}: {(latencyMs / 1000).toFixed(2)}s
                    </span>
                  )}
                  {tokenUsage && (
                    <span className={sharedStyles.pill}>
                      Tokens:{' '}
                      {tokenUsage.total_tokens ||
                        tokenUsage.prompt_tokens + tokenUsage.completion_tokens}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className={sharedStyles.inputRow}>
              <input
                className="input"
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={t('ai_providers.test_input_placeholder')}
                disabled={isRequesting}
                style={{ flex: 1 }}
              />
              <Button
                variant="primary"
                size="sm"
                onClick={handleSend}
                disabled={isRequesting || !promptInput.trim()}
                loading={isRequesting}
                title={t('ai_providers.test_send')}
                aria-label={t('ai_providers.test_send')}
                className={sharedStyles.iconButton}
              >
                <IconSend size={15} />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        // Standard model list view
        <>
          {loading ? (
            <div className={sharedStyles.hint}>
              {t('auth_files.models_loading', { defaultValue: '正在加载模型列表...' })}
            </div>
          ) : error === 'unsupported' ? (
            <EmptyState
              title={t('auth_files.models_unsupported', { defaultValue: '当前版本不支持此功能' })}
              description={t('auth_files.models_unsupported_desc', {
                defaultValue: '请更新 CLI Proxy API 到最新版本后重试',
              })}
            />
          ) : models.length === 0 ? (
            <EmptyState
              title={t('auth_files.models_empty', { defaultValue: '暂无可用模型' })}
              description={t('auth_files.models_empty_desc', {
                defaultValue: '该提供商/凭证可能尚未加载或没有绑定任何模型',
              })}
            />
          ) : (
            <div className={sharedStyles.modelsList}>
              {models.map((model, idx) => {
                const isExcluded = model.isExcluded === true;
                return (
                  <div
                    key={`${model.id}-${idx}`}
                    className={`${sharedStyles.modelItem} ${isExcluded ? sharedStyles.modelItemExcluded : ''}`}
                    onClick={() => handleCopy(model.id)}
                    title={
                      isExcluded
                        ? t('auth_files.models_excluded_hint', {
                            defaultValue: '此 OAuth 模型已被禁用',
                          })
                        : t('common.copy', { defaultValue: '点击复制' })
                    }
                  >
                    <span className={sharedStyles.modelId}>{model.id}</span>
                    {model.display_name && model.display_name !== model.id && (
                      <span className={sharedStyles.modelDisplayName}>{model.display_name}</span>
                    )}
                    {model.type && <span className={sharedStyles.modelType}>{model.type}</span>}
                    {isExcluded && (
                      <span className={sharedStyles.modelExcludedBadge}>
                        {t('auth_files.models_excluded_badge', { defaultValue: '已禁用' })}
                      </span>
                    )}

                    {!isExcluded && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTestModel(model);
                        }}
                        title={t('ai_providers.test_this_model')}
                        aria-label={t('ai_providers.test_this_model')}
                        className={sharedStyles.modelsActionButton}
                        style={{
                          padding: '2px 6px',
                          height: '24px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginLeft: model.type ? '8px' : 'auto',
                        }}
                      >
                        <IconFlaskConical size={12} />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
