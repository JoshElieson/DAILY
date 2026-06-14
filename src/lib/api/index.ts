/**
 * Typed endpoint methods over `apiFetch`. One function per backend route the app
 * uses (backend/docs/API.md §10.1–10.5). Returns DTOs; callers map to domain
 * types via `mappers.ts`.
 */
import { apiFetch } from './session';
import type {
  ContentEntryDTO,
  CreatePromptBody,
  GenerationJobDTO,
  PromptDTO,
  ScheduleDTO,
  TemplateDTO,
} from './types';

export const api = {
  // Prompts -----------------------------------------------------------------
  listPrompts(status?: 'active' | 'paused' | 'archived') {
    const q = status ? `?status=${status}` : '';
    return apiFetch<{ data: PromptDTO[] }>(`/v1/prompts${q}`).then((r) => r.data);
  },

  getPrompt(id: string) {
    return apiFetch<{ prompt: PromptDTO; schedules: ScheduleDTO[]; latest_content: ContentEntryDTO | null }>(
      `/v1/prompts/${id}`,
    );
  },

  createPrompt(body: CreatePromptBody) {
    return apiFetch<{ prompt: PromptDTO; content: ContentEntryDTO | null }>('/v1/prompts', {
      method: 'POST',
      body,
    });
  },

  updatePrompt(id: string, patch: Partial<Pick<PromptDTO, 'type' | 'intent' | 'title' | 'tone' | 'model_pref' | 'position'>>) {
    return apiFetch<PromptDTO>(`/v1/prompts/${id}`, { method: 'PATCH', body: patch });
  },

  deletePrompt(id: string) {
    return apiFetch<{ ok: true }>(`/v1/prompts/${id}`, { method: 'DELETE' });
  },

  pausePrompt(id: string) {
    return apiFetch<PromptDTO>(`/v1/prompts/${id}/pause`, { method: 'POST' });
  },

  resumePrompt(id: string) {
    return apiFetch<PromptDTO>(`/v1/prompts/${id}/resume`, { method: 'POST' });
  },

  reorderPrompt(id: string, position: number) {
    return apiFetch<PromptDTO>(`/v1/prompts/${id}/reorder`, { method: 'POST', body: { position } });
  },

  // Schedules ---------------------------------------------------------------
  updateSchedule(id: string, patch: Partial<Pick<ScheduleDTO, 'frequency' | 'time_of_day' | 'timezone' | 'enabled' | 'days_of_week'>>) {
    return apiFetch<ScheduleDTO>(`/v1/schedules/${id}`, { method: 'PATCH', body: patch });
  },

  // Content & generation ----------------------------------------------------
  today() {
    return apiFetch<{ date: string; entries: ContentEntryDTO[] }>('/v1/content/today');
  },

  promptContent(id: string, range?: { from?: string; to?: string }) {
    const params = new URLSearchParams();
    if (range?.from) params.set('from', range.from);
    if (range?.to) params.set('to', range.to);
    const q = params.toString() ? `?${params}` : '';
    return apiFetch<{ data: ContentEntryDTO[] }>(`/v1/prompts/${id}/content${q}`).then((r) => r.data);
  },

  /** Generate (or fetch the existing) content for a prompt+date — idempotent. */
  generate(promptId: string, forDate?: string) {
    return apiFetch<{ job: GenerationJobDTO; content: ContentEntryDTO }>(
      `/v1/prompts/${promptId}/generate`,
      { method: 'POST', body: { sync: true, for_date: forDate }, timeoutMs: 30000 },
    );
  },

  regenerate(contentId: string) {
    return apiFetch<{ job: GenerationJobDTO; content: ContentEntryDTO }>(
      `/v1/content/${contentId}/regenerate`,
      { method: 'POST', timeoutMs: 30000 },
    );
  },

  // Templates ---------------------------------------------------------------
  templates(type?: string) {
    const q = type ? `?type=${type}` : '';
    return apiFetch<{ data: TemplateDTO[] }>(`/v1/templates${q}`).then((r) => r.data);
  },
};

export { ApiError } from './session';
