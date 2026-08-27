export const STATUS_LABEL = {
  passed: 'PASSED',
  failed: 'FAILED',
  running: 'RUNNING',
  skipped: 'SKIPPED'
}

export function statusLabel(status) {
  return STATUS_LABEL[status] || status || '—'
}

export function statusTagType(status) {
  return (
    {
      passed: 'success',
      failed: 'danger',
      running: '',
      skipped: 'warning',
      idle: 'info'
    }[status] || 'info'
  )
}
