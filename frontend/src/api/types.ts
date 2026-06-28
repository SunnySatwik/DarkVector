export interface AnalyzeRequest {
    duration: number;
    protocol_type: string;
    service: string;
    flag: string;

    src_bytes: number;
    dst_bytes: number;

    land: number;
    wrong_fragment: number;
    urgent: number;

    hot: number;
    num_failed_logins: number;

    logged_in: number;

    num_compromised: number;

    root_shell: number;

    su_attempted: number;

    num_root: number;

    num_file_creations: number;

    num_shells: number;

    num_access_files: number;

    num_outbound_cmds: number;

    is_host_login: number;

    is_guest_login: number;

    count: number;

    srv_count: number;

    serror_rate: number;

    srv_serror_rate: number;

    rerror_rate: number;

    srv_rerror_rate: number;

    same_srv_rate: number;

    diff_srv_rate: number;

    srv_diff_host_rate: number;

    dst_host_count: number;

    dst_host_srv_count: number;

    dst_host_same_srv_rate: number;

    dst_host_diff_srv_rate: number;

    dst_host_same_src_port_rate: number;

    dst_host_srv_diff_host_rate: number;

    dst_host_serror_rate: number;

    dst_host_srv_serror_rate: number;

    dst_host_rerror_rate: number;

    dst_host_srv_rerror_rate: number;
}

export interface AnalyzeResponse {
    anomaly_score: number;
    risk_score: number;
    severity: string;
    is_anomaly: boolean;
}