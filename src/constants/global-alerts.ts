/**
 * Stable identities let the code that owns an alert update or dismiss it
 * without affecting unrelated alerts that happen to share the same status.
 */
export enum GlobalAlertId {
    MasterNodeLimitExceeded = 'master-node-limit-exceeded',
    ParallelLineLimitExceeded = 'parallel-line-limit-exceeded',
    LocalStorageQuotaExceeded = 'local-storage-quota-exceeded',
    OpenInvalidFileType = 'open-invalid-file-type',
    OpenFileFailed = 'open-file-failed',
    ImportRmgProjectFailed = 'import-rmg-project-failed',
    DownloadImageTooBig = 'download-image-too-big',
    MapLoading = 'map-loading',
    MapOverviewEdit = 'map-overview-edit',
}
