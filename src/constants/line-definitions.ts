/** Persisted logical railway lines. A drawing edge has at most one line membership. */
export type LineOperatingStatus = 'planned' | 'construction' | 'operating' | 'closed';

/** Timeline-only labels; the imported railway metadata and map colors stay intact. */
export interface VideoLineLabel {
    name: [string, string];
    lineNumber: string;
    openingDate: string;
    color: string;
}

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
    videoLabel?: VideoLineLabel;
}
