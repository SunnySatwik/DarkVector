import { Alert, Severity } from "../types";
import { EVENT_PROFILES, EventProfile } from "./eventProfiles";

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

const USERNAMES = [
    "alice",
    "bob",
    "charlie",
    "david",
    "eve",
    "m.chen",
    "j.smith",
    "administrator",
    "svc-backup",
    "root",
];

const HOSTS = [
    "srv-k8s-api-01",
    "finance-db-02",
    "eng-workstation-17",
    "vpn-gateway",
    "dc-01",
    "proxy-01",
    "hr-workstation-04",
    "finance-api-01",
    "edge-fw-01",
];

function randomItem<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomIp(): string {
    return `${randomInt(10, 223)}.${randomInt(0, 255)}.${randomInt(
        0,
        255
    )}.${randomInt(1, 254)}`;
}

function generateId() {
    return `AL-${crypto.randomUUID()}`;
}

function randomTimestamp() {
    return new Date().toISOString();
}

function randomScore(profile: EventProfile) {
    return randomInt(profile.scoreRange[0], profile.scoreRange[1]);
}

/* -------------------------------------------------------------------------- */
/*                              Alert Builder                                 */
/* -------------------------------------------------------------------------- */

function buildAlert(profile: EventProfile): Alert {
    return {
        id: generateId(),

        timestamp: randomTimestamp(),

        source: randomItem(HOSTS),

        type: profile.type,

        severity: profile.severity,

        score: randomScore(profile),

        status: "open",

        category: profile.category,

        description: profile.description,

        details: {
            ...profile.details,

            username:
                profile.details.username ??
                randomItem(USERNAMES),

            ipAddress:
                profile.details.ipAddress ??
                randomIp(),

            port:
                profile.details.port ??
                randomInt(20, 65535),

            bytesTransferred:
                profile.details.bytesTransferred ??
                randomInt(5000, 5000000),

            isolationForestScore:
                profile.details.isolationForestScore ??
                Number(Math.random().toFixed(2)),

            shapFactors:
                profile.details.shapFactors?.map((factor) => ({
                    ...factor,
                    impact:
                        Number(
                            (
                                factor.impact +
                                (Math.random() * 0.06 - 0.03)
                            ).toFixed(2)
                        ),
                })),
        },
    };
}

/* -------------------------------------------------------------------------- */
/*                               Public API                                   */
/* -------------------------------------------------------------------------- */

export function generateRandomAlert(): Alert {
    return buildAlert(
        randomItem(EVENT_PROFILES)
    );
}

export function generateAlertBySeverity(
    severity: Severity
): Alert {
    const candidates = EVENT_PROFILES.filter(
        (profile) => profile.severity === severity
    );

    return buildAlert(
        randomItem(candidates)
    );
}

export function generateAlertByType(
    type: string
): Alert {
    const profile = EVENT_PROFILES.find(
        (p) => p.type === type
    );

    if (!profile) {
        throw new Error(
            `Unknown event type: ${type}`
        );
    }

    return buildAlert(profile);
}