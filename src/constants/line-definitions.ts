/** Persisted logical railway lines. A drawing edge has at most one line membership. */
export type LineOperatingStatus = 'planned' | 'construction' | 'operating' | 'closed';

export interface LineDefinition {
    id: string;
    edgeIds: string[];
    name: [string, string];
    lineNumber: string;
    openingDate: string;
    operator: string;
    status: LineOperatingStatus;
    notes: string;
    exportStartStationId: string;
}
