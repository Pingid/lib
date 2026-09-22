/** Generated from an OpenAPI document. Do not edit. */

export type Session = {
    readonly id: string;
    /** Format: date-time */
    expiresAt: string;
    token: string;
    /** Format: date-time */
    createdAt: string;
    /** Format: date-time */
    updatedAt: string;
    ipAddress?: string;
    userAgent?: string;
    userId: string;
    readonly impersonatedBy?: string;
};
export type User = {
    readonly id: string;
    name: string;
    email: string;
    /** @default false */
    readonly emailVerified: boolean;
    image?: string;
    /** Format: date-time */
    createdAt: string;
    /** Format: date-time */
    updatedAt: string;
    readonly role?: string;
    /** @default false */
    readonly banned: boolean;
    readonly banReason?: string;
    /** Format: date-time */
    readonly banExpires?: string;
};
/** @description Success */
export type GetApiAuthAccountInfo = {
    user: {
        name?: string;
        email?: string | null;
        image?: string;
        emailVerified: boolean;
    };
    account: {
        id: string;
        providerId: string;
        accountId: string;
    };
    data: {
        [key: string]: unknown;
    };
};
/** @description User */
export type GetApiAuthAdminGetUser = {
    user?: User;
};
/** @description List of users */
export type GetApiAuthAdminListUsers = {
    users: User[];
    total: number;
    limit?: number;
    offset?: number;
};
/** @description User successfully deleted */
export type GetApiAuthDeleteUserCallback = {
    /** @description Indicates if the deletion was successful */
    success: boolean;
    /**
     * @description Confirmation message
     * @enum {string}
     */
    message: "User deleted";
};
/** @description Success */
export type GetApiAuthError = string;
/** @description Success */
export type GetApiAuthGetSession = {
    session: Session;
    user: User;
} | null;
/** @description Success */
export type GetApiAuthListAccounts = {
    id: string;
    providerId: string;
    /** Format: date-time */
    createdAt: string;
    /** Format: date-time */
    updatedAt: string;
    accountId: string;
    userId: string;
    scopes: string[];
}[];
/** @description Success */
export type GetApiAuthListSessions = Session[];
/** @description API is working */
export type GetApiAuthOk = {
    /** @description Indicates if the API is working */
    ok: boolean;
};
/** @description Success */
export type GetApiAuthResetPasswordToken = {
    token?: string;
};
/** @description Success */
export type GetApiAuthVerifyEmail = {
    user: User;
    /** @description Indicates if the email was verified successfully */
    status: boolean;
};
/** @description Response for status 200 */
export type GetApiDbContainerMeta = {
    id: string;
    created_at: number;
    updated_at: number;
    /** @enum {string} */
    id_type: "name" | "id";
    user_id: string;
}[];
/** @description Response for status 200 */
export type GetApiDockerContainers = {
    Id: string;
    Names: string[];
    Image: string;
    ImageID: string;
    Command: string;
    Created: number;
    Ports: {
        IP?: string;
        PrivatePort: number;
        PublicPort?: number;
        Type?: string;
    }[];
    Labels?: ({
        [key: string]: string;
    } & {
        "com.harbor.id"?: string;
        "com.harbor.link"?: string;
        "com.harbor.title"?: string;
        "com.harbor.description"?: string;
        "com.harbor.icon"?: string;
        "com.harbor.tags"?: string;
        "com.harbor.terminal.command"?: string;
        "com.harbor.proxy"?: string;
        "com.harbor.embed"?: string;
        "com.harbor.proxy.enabled"?: string;
        "com.harbor.proxy.inject"?: string;
        "com.harbor.proxy.rewrite"?: string;
    }) | null;
    State: string;
    Status: string;
    HostConfig?: {
        NetworkMode?: string;
    };
    NetworkSettings?: {
        Networks?: {
            [key: string]: {
                NetworkID?: string;
                EndpointID?: string;
                Gateway?: string;
                IPAddress?: string;
                IPPrefixLen?: number;
                MacAddress?: string;
                Aliases?: string[] | null;
            };
        } | null;
    };
    Mounts?: {
        Name?: string;
        Type: string;
        Source: string;
        Destination: string;
        Driver?: string;
        Mode?: string;
        RW?: boolean;
        Propagation?: string;
    }[];
}[];
/** @description Response for status 200 */
export type GetApiDockerContainersId = {
    Id: string;
    Name: string;
    Created: string;
    Image: string;
    Platform?: string;
    RestartCount?: number;
    State: {
        Status: string;
        Running: boolean;
        Paused: boolean;
        Restarting: boolean;
        OOMKilled?: boolean;
        Dead?: boolean;
        Pid?: number;
        ExitCode?: number;
        Error?: string;
        StartedAt?: string;
        FinishedAt?: string;
        Health?: {
            Status: string;
            FailingStreak?: number;
        };
    };
    Config: {
        Image: string;
        Tty: boolean;
        Cmd?: string[] | null;
        Entrypoint?: (string | string[]) | null;
        WorkingDir?: string;
        Env?: string[] | null;
        Labels?: ({
            [key: string]: string;
        } & {
            "com.harbor.id"?: string;
            "com.harbor.link"?: string;
            "com.harbor.title"?: string;
            "com.harbor.description"?: string;
            "com.harbor.icon"?: string;
            "com.harbor.tags"?: string;
            "com.harbor.terminal.command"?: string;
            "com.harbor.proxy"?: string;
            "com.harbor.embed"?: string;
            "com.harbor.proxy.enabled"?: string;
            "com.harbor.proxy.inject"?: string;
            "com.harbor.proxy.rewrite"?: string;
        }) | null;
    };
    HostConfig: {
        NetworkMode?: string;
        RestartPolicy?: {
            Name: string;
            MaximumRetryCount?: number;
        };
    };
    NetworkSettings: {
        Ports?: {
            [key: string]: {
                HostIp: string;
                HostPort: string;
            }[] | null;
        } | null;
        Networks?: {
            [key: string]: {
                NetworkID?: string;
                EndpointID?: string;
                Gateway?: string;
                IPAddress?: string;
                IPPrefixLen?: number;
                MacAddress?: string;
                Aliases?: string[] | null;
            };
        } | null;
    };
    Mounts?: {
        Name?: string;
        Type: string;
        Source: string;
        Destination: string;
        Driver?: string;
        Mode?: string;
        RW?: boolean;
        Propagation?: string;
    }[];
};
/** @description Response for status 200 */
export type GetApiGlances = {
    at: number;
    uptime?: string | null;
    host?: {
        hostname?: string | null;
        os_name?: string | null;
        os_version?: string | null;
        platform?: string | null;
        linux_distro?: string | null;
        hr_name?: string | null;
    } | null;
    address?: {
        address?: string | null;
        mask_cidr?: number | null;
        public_address?: string | null;
    } | null;
    cpu?: {
        total: number;
        user: number;
        system: number;
        idle: number;
        nice?: number | null;
        iowait?: number | null;
        irq?: number | null;
        steal?: number | null;
        guest?: number | null;
        cpucore?: number | null;
        ctx_switches_rate_per_sec?: number | null;
        interrupts_rate_per_sec?: number | null;
        soft_interrupts_rate_per_sec?: number | null;
    } | null;
    cores?: {
        cpu_number: number;
        total: number;
        user?: number | null;
        system?: number | null;
        idle?: number | null;
        iowait?: number | null;
        steal?: number | null;
    }[] | null;
    load?: {
        min1?: number | null;
        min5?: number | null;
        min15?: number | null;
        cpucore?: number | null;
    } | null;
    memory?: {
        total: number;
        used: number;
        free: number;
        percent: number;
        available?: number | null;
        active?: number | null;
        inactive?: number | null;
        buffers?: number | null;
        cached?: number | null;
        shared?: number | null;
    } | null;
    swap?: {
        total: number;
        used: number;
        free: number;
        percent: number;
        sin?: number | null;
        sout?: number | null;
    } | null;
    network?: {
        interface_name: string;
        alias?: string | null;
        speed?: number | null;
        bytes_recv_rate_per_sec?: number | null;
        bytes_sent_rate_per_sec?: number | null;
        bytes_recv_gauge?: number | null;
        bytes_sent_gauge?: number | null;
    }[] | null;
    diskio?: {
        disk_name: string;
        read_bytes_rate_per_sec?: number | null;
        write_bytes_rate_per_sec?: number | null;
        read_count_rate_per_sec?: number | null;
        write_count_rate_per_sec?: number | null;
        read_bytes_gauge?: number | null;
        write_bytes_gauge?: number | null;
    }[] | null;
    filesystems?: {
        mnt_point: string;
        size: number;
        used: number;
        free: number;
        percent?: number | null;
        device_name?: string | null;
        fs_type?: string | null;
    }[] | null;
    sensors?: {
        label: string;
        value?: number | string | null;
        unit?: string | null;
        type?: string | null;
        warning?: number | string | null;
        critical?: number | string | null;
    }[] | null;
    processes?: {
        total: number;
        running?: number | null;
        sleeping?: number | null;
        thread?: number | null;
    } | null;
    alerts?: {
        state?: string | null;
        type?: string | null;
        begin?: number | null;
        end?: number | null;
        min?: number | null;
        avg?: number | null;
        max?: number | null;
        count?: number | null;
        desc?: string | null;
    }[] | null;
    missing: string[];
};
/** @description Response for status 200 */
export type GetApiGlancesProcesses = {
    rows: {
        pid: number;
        name: string;
        command: string;
        username: string;
        status: string;
        cpu: number;
        memory: number;
        rss: number;
        threads: number;
        nice: number;
    }[];
    total: number;
    matched: number;
};
/** @description Response for status 200 */
export type GetApiSysStats = {
    cpu: {
        usage: number;
        user: number;
        system: number;
    };
    memory: {
        total: number;
        used: number;
        available: number;
        usage: number;
    };
    disks: {
        mount: string;
        size: number;
        used: number;
        available: number;
        usage: number;
    }[];
    network: {
        interface: string;
        rxBytes: number;
        txBytes: number;
        rxPerSecond: number;
        txPerSecond: number;
    }[];
    uptime: {
        uptime: number;
    };
};
/** @description User banned */
export type PostApiAuthAdminBanUser = {
    user?: User;
};
/** @description User created */
export type PostApiAuthAdminCreateUser = {
    user?: User;
};
/** @description Success */
export type PostApiAuthAdminHasPermission = {
    error?: string;
    success: boolean;
};
/** @description Impersonation session created */
export type PostApiAuthAdminImpersonateUser = {
    session?: Session;
    user?: User;
};
/** @description List of user sessions */
export type PostApiAuthAdminListUserSessions = {
    sessions?: Session[];
};
/** @description User removed */
export type PostApiAuthAdminRemoveUser = {
    success?: boolean;
};
/** @description Session revoked */
export type PostApiAuthAdminRevokeUserSession = {
    success?: boolean;
};
/** @description Sessions revoked */
export type PostApiAuthAdminRevokeUserSessions = {
    success?: boolean;
};
/** @description User role updated */
export type PostApiAuthAdminSetRole = {
    user?: User;
};
/** @description Password set */
export type PostApiAuthAdminSetUserPassword = {
    status?: boolean;
};
/** @description User unbanned */
export type PostApiAuthAdminUnbanUser = {
    user?: User;
};
/** @description User updated */
export type PostApiAuthAdminUpdateUser = {
    user?: User;
};
/** @description Email change request processed successfully */
export type PostApiAuthChangeEmail = {
    user?: User;
    /** @description Indicates if the request was successful */
    status: boolean;
    /**
     * @description Status message of the email change process
     * @enum {string|null}
     */
    message?: "Email updated" | "Verification email sent" | null;
};
/** @description Password successfully changed */
export type PostApiAuthChangePassword = {
    /** @description New session token if other sessions were revoked */
    token?: string | null;
    user: {
        /** @description The unique identifier of the user */
        id: string;
        /**
         * Format: email
         * @description The email address of the user
         */
        email: string;
        /** @description The name of the user */
        name: string;
        /**
         * Format: uri
         * @description The profile image URL of the user
         */
        image?: string | null;
        /** @description Whether the email has been verified */
        emailVerified: boolean;
        /**
         * Format: date-time
         * @description When the user was created
         */
        createdAt: string;
        /**
         * Format: date-time
         * @description When the user was last updated
         */
        updatedAt: string;
    };
};
/** @description User deletion processed successfully */
export type PostApiAuthDeleteUser = {
    /** @description Indicates if the operation was successful */
    success: boolean;
    /**
     * @description Status message of the deletion process
     * @enum {string}
     */
    message: "User deleted" | "Verification email sent";
};
/** @description A Valid access token */
export type PostApiAuthGetAccessToken = {
    tokenType?: string;
    idToken?: string;
    accessToken?: string;
    /** Format: date-time */
    accessTokenExpiresAt?: string;
};
/** @description Success */
export type PostApiAuthGetSession = {
    session: Session;
    user: User;
} | null;
/** @description Success */
export type PostApiAuthLinkSocial = {
    /** @description The authorization URL to redirect the user to */
    url?: string;
    /** @description Indicates if the user should be redirected to the authorization URL */
    redirect: boolean;
    status?: boolean;
};
/** @description Access token refreshed successfully */
export type PostApiAuthRefreshToken = {
    tokenType?: string;
    idToken?: string;
    accessToken?: string;
    refreshToken?: string;
    /** Format: date-time */
    accessTokenExpiresAt?: string;
    /** Format: date-time */
    refreshTokenExpiresAt?: string;
};
/** @description Success */
export type PostApiAuthRequestPasswordReset = {
    status?: boolean;
    message?: string;
};
/** @description Success */
export type PostApiAuthResetPassword = {
    status?: boolean;
};
/** @description Success */
export type PostApiAuthRevokeOtherSessions = {
    /** @description Indicates if all other sessions were revoked successfully */
    status: boolean;
};
/** @description Success */
export type PostApiAuthRevokeSession = {
    /** @description Indicates if the session was revoked successfully */
    status: boolean;
};
/** @description Success */
export type PostApiAuthRevokeSessions = {
    /** @description Indicates if all sessions were revoked successfully */
    status: boolean;
};
/** @description Success */
export type PostApiAuthSendVerificationEmail = {
    /**
     * @description Indicates if the email was sent successfully
     * @example true
     */
    status?: boolean;
};
/** @description Success - Returns either session details or redirect URL */
export type PostApiAuthSignInEmail = {
    /** @enum {boolean} */
    redirect: false;
    /** @description Session token */
    token: string;
    url?: string | null;
    user: User;
};
/** @description Success - Returns session details (idToken branch) or an authorize URL (redirect branch) */
export type PostApiAuthSignInSocial = {
    token?: string;
    user?: User;
    url?: string;
    redirect: boolean;
};
/** @description Success */
export type PostApiAuthSignOut = {
    success?: boolean;
    /** @description Provider logout URL when RP-initiated logout is available */
    url?: string;
    /** @description Whether the client should redirect to the provider logout URL */
    redirect?: boolean;
};
/** @description Successfully created user */
export type PostApiAuthSignUpEmail = {
    /** @description Authentication token for the session */
    token?: string | null;
    user: {
        /** @description The unique identifier of the user */
        id: string;
        /**
         * Format: email
         * @description The email address of the user
         */
        email: string;
        /** @description The name of the user */
        name: string;
        /**
         * Format: uri
         * @description The profile image URL of the user
         */
        image?: string | null;
        /** @description Whether the email has been verified */
        emailVerified: boolean;
        /**
         * Format: date-time
         * @description When the user was created
         */
        createdAt: string;
        /**
         * Format: date-time
         * @description When the user was last updated
         */
        updatedAt: string;
    };
};
/** @description Success */
export type PostApiAuthUnlinkAccount = {
    status?: boolean;
};
/** @description Success */
export type PostApiAuthUpdateSession = {
    session?: Session;
};
/** @description Success */
export type PostApiAuthUpdateUser = {
    user?: User;
};
/** @description Success */
export type PostApiAuthVerifyPassword = {
    status?: boolean;
};
/** @description Response for status 200 */
export type PostApiDbContainerConfig = {
    id: string;
    created_at: number;
    updated_at: number;
    /** @enum {string} */
    id_type: "name" | "id";
    user_id: string;
};
/** @description Response for status 200 */
export type PostApiDockerContainersIdAction = {
    Id: string;
    State: string;
    Status: string;
};
/** @description Response for status 200 */
export type PutApiDbContainerConfig = {
    id: string;
    created_at: number;
    updated_at: number;
    /** @enum {string} */
    id_type: "name" | "id";
    user_id: string;
};
export interface Schemas {
    Session: Session;
    User: User;
}
export interface Responses {
    /** @description Success */
    GetApiAuthAccountInfo: GetApiAuthAccountInfo;
    /** @description User */
    GetApiAuthAdminGetUser: GetApiAuthAdminGetUser;
    /** @description List of users */
    GetApiAuthAdminListUsers: GetApiAuthAdminListUsers;
    GetApiAuthCallbackId: never;
    /** @description User successfully deleted */
    GetApiAuthDeleteUserCallback: GetApiAuthDeleteUserCallback;
    /** @description Success */
    GetApiAuthError: GetApiAuthError;
    /** @description Success */
    GetApiAuthGetSession: GetApiAuthGetSession;
    /** @description Success */
    GetApiAuthListAccounts: GetApiAuthListAccounts;
    /** @description Success */
    GetApiAuthListSessions: GetApiAuthListSessions;
    /** @description API is working */
    GetApiAuthOk: GetApiAuthOk;
    /** @description Success */
    GetApiAuthResetPasswordToken: GetApiAuthResetPasswordToken;
    /** @description Success */
    GetApiAuthVerifyEmail: GetApiAuthVerifyEmail;
    /** @description Response for status 200 */
    GetApiDbContainerMeta: GetApiDbContainerMeta;
    /** @description Response for status 200 */
    GetApiDockerContainers: GetApiDockerContainers;
    /** @description Response for status 200 */
    GetApiDockerContainersId: GetApiDockerContainersId;
    GetApiDockerContainersIdLogs: never;
    /** @description Response for status 200 */
    GetApiGlances: GetApiGlances;
    /** @description Response for status 200 */
    GetApiGlancesProcesses: GetApiGlancesProcesses;
    GetApiGlancesStream: never;
    GetApiProxyResolve: never;
    /** @description Response for status 200 */
    GetApiSysStats: GetApiSysStats;
    GetApiSysStatsStream: never;
    GetApiVerify: never;
    /** @description User banned */
    PostApiAuthAdminBanUser: PostApiAuthAdminBanUser;
    /** @description User created */
    PostApiAuthAdminCreateUser: PostApiAuthAdminCreateUser;
    /** @description Success */
    PostApiAuthAdminHasPermission: PostApiAuthAdminHasPermission;
    /** @description Impersonation session created */
    PostApiAuthAdminImpersonateUser: PostApiAuthAdminImpersonateUser;
    /** @description List of user sessions */
    PostApiAuthAdminListUserSessions: PostApiAuthAdminListUserSessions;
    /** @description User removed */
    PostApiAuthAdminRemoveUser: PostApiAuthAdminRemoveUser;
    /** @description Session revoked */
    PostApiAuthAdminRevokeUserSession: PostApiAuthAdminRevokeUserSession;
    /** @description Sessions revoked */
    PostApiAuthAdminRevokeUserSessions: PostApiAuthAdminRevokeUserSessions;
    /** @description User role updated */
    PostApiAuthAdminSetRole: PostApiAuthAdminSetRole;
    /** @description Password set */
    PostApiAuthAdminSetUserPassword: PostApiAuthAdminSetUserPassword;
    PostApiAuthAdminStopImpersonating: never;
    /** @description User unbanned */
    PostApiAuthAdminUnbanUser: PostApiAuthAdminUnbanUser;
    /** @description User updated */
    PostApiAuthAdminUpdateUser: PostApiAuthAdminUpdateUser;
    PostApiAuthCallbackId: never;
    /** @description Email change request processed successfully */
    PostApiAuthChangeEmail: PostApiAuthChangeEmail;
    /** @description Password successfully changed */
    PostApiAuthChangePassword: PostApiAuthChangePassword;
    /** @description User deletion processed successfully */
    PostApiAuthDeleteUser: PostApiAuthDeleteUser;
    /** @description A Valid access token */
    PostApiAuthGetAccessToken: PostApiAuthGetAccessToken;
    /** @description Success */
    PostApiAuthGetSession: PostApiAuthGetSession;
    /** @description Success */
    PostApiAuthLinkSocial: PostApiAuthLinkSocial;
    /** @description Access token refreshed successfully */
    PostApiAuthRefreshToken: PostApiAuthRefreshToken;
    /** @description Success */
    PostApiAuthRequestPasswordReset: PostApiAuthRequestPasswordReset;
    /** @description Success */
    PostApiAuthResetPassword: PostApiAuthResetPassword;
    /** @description Success */
    PostApiAuthRevokeOtherSessions: PostApiAuthRevokeOtherSessions;
    /** @description Success */
    PostApiAuthRevokeSession: PostApiAuthRevokeSession;
    /** @description Success */
    PostApiAuthRevokeSessions: PostApiAuthRevokeSessions;
    /** @description Success */
    PostApiAuthSendVerificationEmail: PostApiAuthSendVerificationEmail;
    /** @description Success - Returns either session details or redirect URL */
    PostApiAuthSignInEmail: PostApiAuthSignInEmail;
    /** @description Success - Returns session details (idToken branch) or an authorize URL (redirect branch) */
    PostApiAuthSignInSocial: PostApiAuthSignInSocial;
    /** @description Success */
    PostApiAuthSignOut: PostApiAuthSignOut;
    /** @description Successfully created user */
    PostApiAuthSignUpEmail: PostApiAuthSignUpEmail;
    /** @description Success */
    PostApiAuthUnlinkAccount: PostApiAuthUnlinkAccount;
    /** @description Success */
    PostApiAuthUpdateSession: PostApiAuthUpdateSession;
    /** @description Success */
    PostApiAuthUpdateUser: PostApiAuthUpdateUser;
    /** @description Success */
    PostApiAuthVerifyPassword: PostApiAuthVerifyPassword;
    /** @description Response for status 200 */
    PostApiDbContainerConfig: PostApiDbContainerConfig;
    /** @description Response for status 200 */
    PostApiDockerContainersIdAction: PostApiDockerContainersIdAction;
    /** @description Response for status 200 */
    PutApiDbContainerConfig: PutApiDbContainerConfig;
}
export interface Routes {
    /** @description Get the account info provided by the provider */
    "GET /api/auth/account-info": {
        method: "GET";
        url: "/api/auth/account-info";
        replies: {
            /** @description Success */
            200: GetApiAuthAccountInfo;
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description Get an existing user */
    "GET /api/auth/admin/get-user": {
        method: "GET";
        url: "/api/auth/admin/get-user";
        query?: {
            id?: string;
        };
        replies: {
            /** @description User */
            200: GetApiAuthAdminGetUser;
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description List users */
    "GET /api/auth/admin/list-users": {
        method: "GET";
        url: "/api/auth/admin/list-users";
        query?: {
            searchValue?: string;
            searchField?: "email" | "name";
            searchOperator?: "contains" | "starts_with" | "ends_with";
            limit?: string | number;
            offset?: string | number;
            sortBy?: string;
            sortDirection?: "asc" | "desc";
            filterField?: string;
            filterValue?: (((string | number) | boolean) | string[]) | number[];
            filterOperator?: "eq" | "ne" | "lt" | "lte" | "gt" | "gte" | "in" | "not_in" | "contains" | "starts_with" | "ends_with";
        };
        replies: {
            /** @description List of users */
            200: GetApiAuthAdminListUsers;
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    "GET /api/auth/callback/{id}": {
        method: "GET";
        url: "/api/auth/callback/{id}";
        path: {
            id: string;
        };
        replies: {
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description Callback to complete user deletion with verification token */
    "GET /api/auth/delete-user/callback": {
        method: "GET";
        url: "/api/auth/delete-user/callback";
        query?: {
            token?: string;
            callbackURL?: string;
        };
        replies: {
            /** @description User successfully deleted */
            200: GetApiAuthDeleteUserCallback;
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description Displays an error page */
    "GET /api/auth/error": {
        method: "GET";
        url: "/api/auth/error";
        replies: {
            /** @description Success */
            200: GetApiAuthError;
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description Get the current session */
    "GET /api/auth/get-session": {
        method: "GET";
        url: "/api/auth/get-session";
        replies: {
            /** @description Success */
            200: GetApiAuthGetSession;
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description List all accounts linked to the user */
    "GET /api/auth/list-accounts": {
        method: "GET";
        url: "/api/auth/list-accounts";
        replies: {
            /** @description Success */
            200: GetApiAuthListAccounts;
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description List all active sessions for the user */
    "GET /api/auth/list-sessions": {
        method: "GET";
        url: "/api/auth/list-sessions";
        replies: {
            /** @description Success */
            200: GetApiAuthListSessions;
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description Check if the API is working */
    "GET /api/auth/ok": {
        method: "GET";
        url: "/api/auth/ok";
        replies: {
            /** @description API is working */
            200: GetApiAuthOk;
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description Redirects the user to the callback URL with the token */
    "GET /api/auth/reset-password/{token}": {
        method: "GET";
        url: "/api/auth/reset-password/{token}";
        path: {
            /** @description The token to reset the password */
            token: string;
        };
        query: {
            /** @description The URL to redirect the user to reset their password */
            callbackURL: string;
        };
        replies: {
            /** @description Success */
            200: GetApiAuthResetPasswordToken;
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description Verify the email of the user */
    "GET /api/auth/verify-email": {
        method: "GET";
        url: "/api/auth/verify-email";
        query: {
            /** @description The token to verify the email */
            token: string;
            /** @description The URL to redirect to after email verification */
            callbackURL?: string;
        };
        replies: {
            /** @description Success */
            200: GetApiAuthVerifyEmail;
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description Get container configuration */
    "GET /api/db/container-meta": {
        method: "GET";
        url: "/api/db/container-meta";
        replies: {
            /** @description Response for status 200 */
            200: GetApiDbContainerMeta;
        };
    };
    /** @description List all containers */
    "GET /api/docker/containers": {
        method: "GET";
        url: "/api/docker/containers";
        query: {
            limit?: number;
            all: boolean;
        };
        replies: {
            /** @description Response for status 200 */
            200: GetApiDockerContainers;
        };
    };
    /** @description Inspect a container */
    "GET /api/docker/containers/{id}": {
        method: "GET";
        url: "/api/docker/containers/{id}";
        path: {
            id: string;
        };
        replies: {
            /** @description Response for status 200 */
            200: GetApiDockerContainersId;
        };
    };
    /** @description Follow a container log stream (server-sent events) */
    "GET /api/docker/containers/{id}/logs": {
        method: "GET";
        url: "/api/docker/containers/{id}/logs";
        path: {
            id: string;
        };
        query: {
            tail: number;
        };
    };
    /** @description Read the whole machine from Glances */
    "GET /api/glances/": {
        method: "GET";
        url: "/api/glances/";
        replies: {
            /** @description Response for status 200 */
            200: GetApiGlances;
        };
    };
    /** @description The busiest processes on the machine */
    "GET /api/glances/processes": {
        method: "GET";
        url: "/api/glances/processes";
        query: {
            sort: "cpu" | "memory" | "name" | "pid";
            limit: number;
            search?: string;
        };
        replies: {
            /** @description Response for status 200 */
            200: GetApiGlancesProcesses;
        };
    };
    /** @description Stream Glances stats */
    "GET /api/glances/stream": {
        method: "GET";
        url: "/api/glances/stream";
        query: {
            poll: number;
        };
    };
    /** @description Authorise a proxied request and resolve its upstream */
    "GET /api/proxy/resolve": {
        method: "GET";
        url: "/api/proxy/resolve";
        query?: {
            host?: string;
        };
    };
    /** @description Status system information */
    "GET /api/sys/stats": {
        method: "GET";
        url: "/api/sys/stats";
        replies: {
            /** @description Response for status 200 */
            200: GetApiSysStats;
        };
    };
    /** @description Stream system information */
    "GET /api/sys/stats/stream": {
        method: "GET";
        url: "/api/sys/stats/stream";
        query: {
            poll: number;
        };
    };
    /** @description Verify the authentication token */
    "GET /api/verify": {
        method: "GET";
        url: "/api/verify";
    };
    /** @description Ban a user */
    "POST /api/auth/admin/ban-user": {
        method: "POST";
        url: "/api/auth/admin/ban-user";
        body: {
            /** @description The user id */
            userId: string;
            /** @description The reason for the ban */
            banReason?: string;
            /** @description The number of seconds until the ban expires */
            banExpiresIn?: number;
        };
        replies: {
            /** @description User banned */
            200: PostApiAuthAdminBanUser;
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description Create a new user */
    "POST /api/auth/admin/create-user": {
        method: "POST";
        url: "/api/auth/admin/create-user";
        body: {
            /** @description The email of the user */
            email: string;
            password?: string;
            /** @description The name of the user */
            name: string;
            role?: string | string[];
            data?: {
                [key: string]: unknown;
            };
        };
        replies: {
            /** @description User created */
            200: PostApiAuthAdminCreateUser;
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description Check if the user has permission */
    "POST /api/auth/admin/has-permission": {
        method: "POST";
        url: "/api/auth/admin/has-permission";
        body?: {
            /** @description The permission to check */
            permissions: Record<string, never>;
        };
        replies: {
            /** @description Success */
            200: PostApiAuthAdminHasPermission;
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description Impersonate a user */
    "POST /api/auth/admin/impersonate-user": {
        method: "POST";
        url: "/api/auth/admin/impersonate-user";
        body: {
            /** @description The user id */
            userId: string;
        };
        replies: {
            /** @description Impersonation session created */
            200: PostApiAuthAdminImpersonateUser;
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description List user sessions */
    "POST /api/auth/admin/list-user-sessions": {
        method: "POST";
        url: "/api/auth/admin/list-user-sessions";
        body: {
            /** @description The user id */
            userId: string;
        };
        replies: {
            /** @description List of user sessions */
            200: PostApiAuthAdminListUserSessions;
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description Delete a user and all their sessions and accounts. Cannot be undone. */
    "POST /api/auth/admin/remove-user": {
        method: "POST";
        url: "/api/auth/admin/remove-user";
        body: {
            /** @description The user id */
            userId: string;
        };
        replies: {
            /** @description User removed */
            200: PostApiAuthAdminRemoveUser;
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description Revoke a user session */
    "POST /api/auth/admin/revoke-user-session": {
        method: "POST";
        url: "/api/auth/admin/revoke-user-session";
        body: {
            /** @description The session token */
            sessionToken: string;
        };
        replies: {
            /** @description Session revoked */
            200: PostApiAuthAdminRevokeUserSession;
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description Revoke all user sessions */
    "POST /api/auth/admin/revoke-user-sessions": {
        method: "POST";
        url: "/api/auth/admin/revoke-user-sessions";
        body: {
            /** @description The user id */
            userId: string;
        };
        replies: {
            /** @description Sessions revoked */
            200: PostApiAuthAdminRevokeUserSessions;
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description Set the role of a user */
    "POST /api/auth/admin/set-role": {
        method: "POST";
        url: "/api/auth/admin/set-role";
        body: {
            /** @description The user id */
            userId: string;
            /** @description The role to set, this can be a string or an array of strings. Eg: `admin` or `[admin, user]` */
            role: string | string[];
        };
        replies: {
            /** @description User role updated */
            200: PostApiAuthAdminSetRole;
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description Set a user's password */
    "POST /api/auth/admin/set-user-password": {
        method: "POST";
        url: "/api/auth/admin/set-user-password";
        body: {
            /** @description The new password */
            newPassword: string;
            /** @description The user id */
            userId: string;
        };
        replies: {
            /** @description Password set */
            200: PostApiAuthAdminSetUserPassword;
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    "POST /api/auth/admin/stop-impersonating": {
        method: "POST";
        url: "/api/auth/admin/stop-impersonating";
        replies: {
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description Unban a user */
    "POST /api/auth/admin/unban-user": {
        method: "POST";
        url: "/api/auth/admin/unban-user";
        body: {
            /** @description The user id */
            userId: string;
        };
        replies: {
            /** @description User unbanned */
            200: PostApiAuthAdminUnbanUser;
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description Update a user's details */
    "POST /api/auth/admin/update-user": {
        method: "POST";
        url: "/api/auth/admin/update-user";
        body: {
            /** @description The user id */
            userId: string;
            /** @description The user data to update */
            data: {
                [key: string]: unknown;
            };
        };
        replies: {
            /** @description User updated */
            200: PostApiAuthAdminUpdateUser;
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    "POST /api/auth/callback/{id}": {
        method: "POST";
        url: "/api/auth/callback/{id}";
        path: {
            id: string;
        };
        body?: {
            code?: string;
            error?: string;
            device_id?: string;
            error_description?: string;
            state?: string;
            user?: string;
            iss?: string;
        };
        replies: {
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    "POST /api/auth/change-email": {
        method: "POST";
        url: "/api/auth/change-email";
        body: {
            /** @description The new email address to set must be a valid email address */
            newEmail: string;
            /** @description The URL to redirect to after email verification */
            callbackURL?: string;
        };
        replies: {
            /** @description Email change request processed successfully */
            200: PostApiAuthChangeEmail;
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description Change the password of the user */
    "POST /api/auth/change-password": {
        method: "POST";
        url: "/api/auth/change-password";
        body: {
            /** @description The new password to set */
            newPassword: string;
            /** @description The current password is required */
            currentPassword: string;
            /** @description Must be a boolean value */
            revokeOtherSessions?: boolean;
        };
        replies: {
            /** @description Password successfully changed */
            200: PostApiAuthChangePassword;
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description Delete the user */
    "POST /api/auth/delete-user": {
        method: "POST";
        url: "/api/auth/delete-user";
        body?: {
            /** @description The callback URL to redirect to after the user is deleted */
            callbackURL?: string;
            /** @description The user's password. Required if session is not fresh */
            password?: string;
            /** @description The deletion verification token */
            token?: string;
        };
        replies: {
            /** @description User deletion processed successfully */
            200: PostApiAuthDeleteUser;
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description Get a valid access token, doing a refresh if needed */
    "POST /api/auth/get-access-token": {
        method: "POST";
        url: "/api/auth/get-access-token";
        body: {
            /** @description The Better Auth account ID */
            accountId: string;
            /** @description The user ID associated with the account */
            userId?: string;
        } | {
            /**
             * @description Select the current OAuth account from its signed cookie
             * @enum {unknown}
             */
            useAccountCookie: true;
            /** @description The user ID associated with the account */
            userId?: string;
        };
        replies: {
            /** @description A Valid access token */
            200: PostApiAuthGetAccessToken;
            /** @description Invalid refresh token or provider configuration */
            400: never;
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description Get the current session */
    "POST /api/auth/get-session": {
        method: "POST";
        url: "/api/auth/get-session";
        replies: {
            /** @description Success */
            200: PostApiAuthGetSession;
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description Link a social account to the user */
    "POST /api/auth/link-social": {
        method: "POST";
        url: "/api/auth/link-social";
        body: {
            /** @description The URL to redirect to after the user has signed in */
            callbackURL?: string;
            provider: ("apple" | "atlassian" | "cloudflare" | "cognito" | "discord" | "facebook" | "figma" | "github" | "microsoft" | "google" | "huggingface" | "slack" | "spotify" | "twitch" | "twitter" | "dropbox" | "kick" | "linear" | "linkedin" | "gitlab" | "tiktok" | "reddit" | "roblox" | "salesforce" | "vk" | "zoom" | "notion" | "kakao" | "naver" | "line" | "paybin" | "paypal" | "polar" | "railway" | "vercel" | "wechat") | string;
            idToken?: {
                token: string;
                nonce?: string;
                accessToken?: string;
                refreshToken?: string;
            };
            requestSignUp?: boolean;
            /** @description Additional scopes to request from the provider */
            scopes?: string[];
            /** @description The URL to redirect to if there is an error during the link process */
            errorCallbackURL?: string;
            /** @description Disable automatic redirection to the provider. Useful for handling the redirection yourself */
            disableRedirect?: boolean;
            /** @description The login hint to use for the authorization code request */
            loginHint?: string;
            /** @description Extra query parameters to append to the provider authorization URL (e.g. Cognito identity_provider, Google hd). */
            additionalParams?: {
                [key: string]: string;
            };
            additionalData?: {
                [key: string]: unknown;
            };
        };
        replies: {
            /** @description Success */
            200: PostApiAuthLinkSocial;
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description Refresh the access token using a refresh token */
    "POST /api/auth/refresh-token": {
        method: "POST";
        url: "/api/auth/refresh-token";
        body: {
            /** @description The Better Auth account ID */
            accountId: string;
            /** @description The user ID associated with the account */
            userId?: string;
        } | {
            /**
             * @description Select the current OAuth account from its signed cookie
             * @enum {unknown}
             */
            useAccountCookie: true;
            /** @description The user ID associated with the account */
            userId?: string;
        };
        replies: {
            /** @description Access token refreshed successfully */
            200: PostApiAuthRefreshToken;
            /** @description Invalid refresh token or provider configuration */
            400: never;
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description Send a password reset email to the user */
    "POST /api/auth/request-password-reset": {
        method: "POST";
        url: "/api/auth/request-password-reset";
        body: {
            /** @description The email address of the user to send a password reset email to */
            email: string;
            /** @description The URL to redirect the user to reset their password. If the token isn't valid or expired, it'll be redirected with a query parameter `?error=INVALID_TOKEN`. If the token is valid, it'll be redirected with a query parameter `?token=VALID_TOKEN */
            redirectTo?: string;
        };
        replies: {
            /** @description Success */
            200: PostApiAuthRequestPasswordReset;
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description Reset the password for a user */
    "POST /api/auth/reset-password": {
        method: "POST";
        url: "/api/auth/reset-password";
        body: {
            /** @description The new password to set */
            newPassword: string;
            /** @description The token to reset the password */
            token?: string;
        };
        replies: {
            /** @description Success */
            200: PostApiAuthResetPassword;
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description Revoke all other sessions for the user except the current one */
    "POST /api/auth/revoke-other-sessions": {
        method: "POST";
        url: "/api/auth/revoke-other-sessions";
        replies: {
            /** @description Success */
            200: PostApiAuthRevokeOtherSessions;
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description Revoke a single session */
    "POST /api/auth/revoke-session": {
        method: "POST";
        url: "/api/auth/revoke-session";
        body?: {
            /** @description The token to revoke */
            token: string;
        };
        replies: {
            /** @description Success */
            200: PostApiAuthRevokeSession;
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description Revoke all sessions for the user */
    "POST /api/auth/revoke-sessions": {
        method: "POST";
        url: "/api/auth/revoke-sessions";
        replies: {
            /** @description Success */
            200: PostApiAuthRevokeSessions;
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description Send a verification email to the user */
    "POST /api/auth/send-verification-email": {
        method: "POST";
        url: "/api/auth/send-verification-email";
        body?: {
            /**
             * @description The email to send the verification email to
             * @example user@example.com
             */
            email: string;
            /**
             * @description The URL to use for email verification callback
             * @example https://example.com/callback
             */
            callbackURL?: string | null;
        };
        replies: {
            /** @description Success */
            200: PostApiAuthSendVerificationEmail;
            /** @description Bad Request */
            400: {
                /**
                 * @description Error message
                 * @example Verification email isn't enabled
                 */
                message?: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description Sign in with email and password */
    "POST /api/auth/sign-in/email": {
        method: "POST";
        url: "/api/auth/sign-in/email";
        body: {
            /** @description Email of the user */
            email: string;
            /** @description Password of the user */
            password: string;
            /** @description Callback URL to use as a redirect for email verification */
            callbackURL?: string;
            /** @description If this is false, the session will not be remembered. Default is `true`. */
            rememberMe?: boolean;
        };
        replies: {
            /** @description Success - Returns either session details or redirect URL */
            200: PostApiAuthSignInEmail;
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description Sign in with a social provider */
    "POST /api/auth/sign-in/social": {
        method: "POST";
        url: "/api/auth/sign-in/social";
        body: {
            /** @description Callback URL to redirect to after the user has signed in */
            callbackURL?: string;
            newUserCallbackURL?: string;
            /** @description Callback URL to redirect to if an error happens */
            errorCallbackURL?: string;
            provider: ("apple" | "atlassian" | "cloudflare" | "cognito" | "discord" | "facebook" | "figma" | "github" | "microsoft" | "google" | "huggingface" | "slack" | "spotify" | "twitch" | "twitter" | "dropbox" | "kick" | "linear" | "linkedin" | "gitlab" | "tiktok" | "reddit" | "roblox" | "salesforce" | "vk" | "zoom" | "notion" | "kakao" | "naver" | "line" | "paybin" | "paypal" | "polar" | "railway" | "vercel" | "wechat") | string;
            /** @description Disable automatic redirection to the provider. Useful for handling the redirection yourself */
            disableRedirect?: boolean;
            idToken?: {
                /** @description ID token from the provider */
                token: string;
                /** @description Nonce used to generate the token */
                nonce?: string;
                /** @description Access token from the provider */
                accessToken?: string;
                /** @description Refresh token from the provider */
                refreshToken?: string;
                /** @description Expiry date of the token */
                expiresAt?: number;
                /** @description The user object from the provider. Only available for some providers like Apple. */
                user?: {
                    name?: {
                        firstName?: string;
                        lastName?: string;
                    };
                    email?: string;
                };
            };
            /** @description Array of scopes to request from the provider. This will override the default scopes passed. */
            scopes?: string[];
            /** @description Explicitly request sign-up. Useful when disableImplicitSignUp is true for this provider */
            requestSignUp?: boolean;
            /** @description The login hint to use for the authorization code request */
            loginHint?: string;
            /** @description Extra query parameters to append to the provider authorization URL (e.g. Cognito identity_provider, Google hd). */
            additionalParams?: {
                [key: string]: string;
            };
            additionalData?: {
                [key: string]: unknown;
            };
        };
        replies: {
            /** @description Success - Returns session details (idToken branch) or an authorize URL (redirect branch) */
            200: PostApiAuthSignInSocial;
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description Sign out the current user */
    "POST /api/auth/sign-out": {
        method: "POST";
        url: "/api/auth/sign-out";
        body?: {
            /** @description The URL to redirect to after provider logout */
            callbackURL?: string;
            /** @description Return the provider logout URL without redirecting */
            disableRedirect?: boolean;
            /** @description State to pass to the provider logout endpoint */
            state?: string;
        };
        replies: {
            /** @description Success */
            200: PostApiAuthSignOut;
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description Sign up a user using email and password */
    "POST /api/auth/sign-up/email": {
        method: "POST";
        url: "/api/auth/sign-up/email";
        body?: {
            /** @description The name of the user */
            name: string;
            /** @description The email of the user */
            email: string;
            /** @description The password of the user */
            password: string;
            /** @description The profile image URL of the user */
            image?: string;
            /** @description The URL to use for email verification callback */
            callbackURL?: string;
            /** @description If this is false, the session will not be remembered. Default is `true`. */
            rememberMe?: boolean;
        };
        replies: {
            /** @description Successfully created user */
            200: PostApiAuthSignUpEmail;
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Unprocessable Entity. User already exists or failed to create user. */
            422: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description Unlink an account */
    "POST /api/auth/unlink-account": {
        method: "POST";
        url: "/api/auth/unlink-account";
        body: {
            /** @description The Better Auth account ID to unlink */
            accountId: string;
        };
        replies: {
            /** @description Success */
            200: PostApiAuthUnlinkAccount;
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description Update the current session */
    "POST /api/auth/update-session": {
        method: "POST";
        url: "/api/auth/update-session";
        body: {
            [key: string]: unknown;
        };
        replies: {
            /** @description Success */
            200: PostApiAuthUpdateSession;
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description Update the current user */
    "POST /api/auth/update-user": {
        method: "POST";
        url: "/api/auth/update-user";
        body?: {
            /** @description The name of the user */
            name?: string;
            /** @description The image of the user */
            image?: string | null;
        };
        replies: {
            /** @description Success */
            200: PostApiAuthUpdateUser;
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description Verify the current user's password */
    "POST /api/auth/verify-password": {
        method: "POST";
        url: "/api/auth/verify-password";
        body: {
            /** @description The password to verify */
            password: string;
        };
        replies: {
            /** @description Success */
            200: PostApiAuthVerifyPassword;
            /** @description Bad Request. Usually due to missing parameters, or invalid parameters. */
            400: {
                message: string;
            };
            /** @description Unauthorized. Due to missing or invalid authentication. */
            401: {
                message: string;
            };
            /** @description Forbidden. You do not have permission to access this resource or to perform this action. */
            403: {
                message?: string;
            };
            /** @description Not Found. The requested resource was not found. */
            404: {
                message?: string;
            };
            /** @description Too Many Requests. You have exceeded the rate limit. Try again later. */
            429: {
                message?: string;
            };
            /** @description Internal Server Error. This is a problem with the server that you cannot fix. */
            500: {
                message?: string;
            };
        };
    };
    /** @description Create container configuration */
    "POST /api/db/container-config": {
        method: "POST";
        url: "/api/db/container-config";
        body: {
            id?: string;
            /** @enum {string} */
            id_type?: "name" | "id";
            user_id?: string;
        } | {
            id?: string;
            /** @enum {string} */
            id_type?: "name" | "id";
            user_id?: string;
        } | {
            id?: string;
            /** @enum {string} */
            id_type?: "name" | "id";
            user_id?: string;
        };
        replies: {
            /** @description Response for status 200 */
            200: PostApiDbContainerConfig;
        };
    };
    /** @description Perform an action on a container */
    "POST /api/docker/containers/{id}/{action}": {
        method: "POST";
        url: "/api/docker/containers/{id}/{action}";
        path: {
            id: string;
            action: "start" | "stop" | "restart" | "pause" | "unpause";
        };
        replies: {
            /** @description Response for status 200 */
            200: PostApiDockerContainersIdAction;
        };
    };
    /** @description Update container configuration */
    "PUT /api/db/container-config": {
        method: "PUT";
        url: "/api/db/container-config";
        body: {
            id: string;
            /** @enum {string} */
            id_type?: "name" | "id";
            user_id?: string;
        } | {
            id: string;
            /** @enum {string} */
            id_type?: "name" | "id";
            user_id?: string;
        } | {
            id: string;
            /** @enum {string} */
            id_type?: "name" | "id";
            user_id?: string;
        };
        replies: {
            /** @description Response for status 200 */
            200: PutApiDbContainerConfig;
        };
    };
}
const search = (params: Record<string, unknown> | undefined): string => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params ?? {}))
        for (const item of Array.isArray(value) ? value : [value])
            if (item !== undefined && item !== null)
                query.append(key, String(item));
    return query.size ? `?${query}` : "";
};
export const requests = {
    "GET /api/auth/account-info": () => ({
        method: "GET",
        url: "/api/auth/account-info"
    }),
    "GET /api/auth/admin/get-user": (p: {
        query?: {
            id?: string;
        };
    }) => ({
        method: "GET",
        url: `/api/auth/admin/get-user${search(p.query)}`
    }),
    "GET /api/auth/admin/list-users": (p: {
        query?: {
            searchValue?: string;
            searchField?: "email" | "name";
            searchOperator?: "contains" | "starts_with" | "ends_with";
            limit?: string | number;
            offset?: string | number;
            sortBy?: string;
            sortDirection?: "asc" | "desc";
            filterField?: string;
            filterValue?: (((string | number) | boolean) | string[]) | number[];
            filterOperator?: "eq" | "ne" | "lt" | "lte" | "gt" | "gte" | "in" | "not_in" | "contains" | "starts_with" | "ends_with";
        };
    }) => ({
        method: "GET",
        url: `/api/auth/admin/list-users${search(p.query)}`
    }),
    "GET /api/auth/callback/{id}": (p: {
        path: {
            id: string;
        };
    }) => ({
        method: "GET",
        url: `/api/auth/callback/${p.path.id}`
    }),
    "GET /api/auth/delete-user/callback": (p: {
        query?: {
            token?: string;
            callbackURL?: string;
        };
    }) => ({
        method: "GET",
        url: `/api/auth/delete-user/callback${search(p.query)}`
    }),
    "GET /api/auth/error": () => ({
        method: "GET",
        url: "/api/auth/error"
    }),
    "GET /api/auth/get-session": () => ({
        method: "GET",
        url: "/api/auth/get-session"
    }),
    "GET /api/auth/list-accounts": () => ({
        method: "GET",
        url: "/api/auth/list-accounts"
    }),
    "GET /api/auth/list-sessions": () => ({
        method: "GET",
        url: "/api/auth/list-sessions"
    }),
    "GET /api/auth/ok": () => ({
        method: "GET",
        url: "/api/auth/ok"
    }),
    "GET /api/auth/reset-password/{token}": (p: {
        path: {
            /** @description The token to reset the password */
            token: string;
        };
        query: {
            /** @description The URL to redirect the user to reset their password */
            callbackURL: string;
        };
    }) => ({
        method: "GET",
        url: `/api/auth/reset-password/${p.path.token}${search(p.query)}`
    }),
    "GET /api/auth/verify-email": (p: {
        query: {
            /** @description The token to verify the email */
            token: string;
            /** @description The URL to redirect to after email verification */
            callbackURL?: string;
        };
    }) => ({
        method: "GET",
        url: `/api/auth/verify-email${search(p.query)}`
    }),
    "GET /api/db/container-meta": () => ({
        method: "GET",
        url: "/api/db/container-meta"
    }),
    "GET /api/docker/containers": (p: {
        query: {
            limit?: number;
            all: boolean;
        };
    }) => ({
        method: "GET",
        url: `/api/docker/containers${search(p.query)}`
    }),
    "GET /api/docker/containers/{id}": (p: {
        path: {
            id: string;
        };
    }) => ({
        method: "GET",
        url: `/api/docker/containers/${p.path.id}`
    }),
    "GET /api/docker/containers/{id}/logs": (p: {
        path: {
            id: string;
        };
        query: {
            tail: number;
        };
    }) => ({
        method: "GET",
        url: `/api/docker/containers/${p.path.id}/logs${search(p.query)}`
    }),
    "GET /api/glances/": () => ({
        method: "GET",
        url: "/api/glances/"
    }),
    "GET /api/glances/processes": (p: {
        query: {
            sort: "cpu" | "memory" | "name" | "pid";
            limit: number;
            search?: string;
        };
    }) => ({
        method: "GET",
        url: `/api/glances/processes${search(p.query)}`
    }),
    "GET /api/glances/stream": (p: {
        query: {
            poll: number;
        };
    }) => ({
        method: "GET",
        url: `/api/glances/stream${search(p.query)}`
    }),
    "GET /api/proxy/resolve": (p: {
        query?: {
            host?: string;
        };
    }) => ({
        method: "GET",
        url: `/api/proxy/resolve${search(p.query)}`
    }),
    "GET /api/sys/stats": () => ({
        method: "GET",
        url: "/api/sys/stats"
    }),
    "GET /api/sys/stats/stream": (p: {
        query: {
            poll: number;
        };
    }) => ({
        method: "GET",
        url: `/api/sys/stats/stream${search(p.query)}`
    }),
    "GET /api/verify": () => ({
        method: "GET",
        url: "/api/verify"
    }),
    "POST /api/auth/admin/ban-user": (p: {
        body: {
            /** @description The user id */
            userId: string;
            /** @description The reason for the ban */
            banReason?: string;
            /** @description The number of seconds until the ban expires */
            banExpiresIn?: number;
        };
    }) => ({
        method: "POST",
        url: "/api/auth/admin/ban-user",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(p.body)
    }),
    "POST /api/auth/admin/create-user": (p: {
        body: {
            /** @description The email of the user */
            email: string;
            password?: string;
            /** @description The name of the user */
            name: string;
            role?: string | string[];
            data?: {
                [key: string]: unknown;
            };
        };
    }) => ({
        method: "POST",
        url: "/api/auth/admin/create-user",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(p.body)
    }),
    "POST /api/auth/admin/has-permission": (p: {
        body?: {
            /** @description The permission to check */
            permissions: Record<string, never>;
        };
    }) => ({
        method: "POST",
        url: "/api/auth/admin/has-permission",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(p.body)
    }),
    "POST /api/auth/admin/impersonate-user": (p: {
        body: {
            /** @description The user id */
            userId: string;
        };
    }) => ({
        method: "POST",
        url: "/api/auth/admin/impersonate-user",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(p.body)
    }),
    "POST /api/auth/admin/list-user-sessions": (p: {
        body: {
            /** @description The user id */
            userId: string;
        };
    }) => ({
        method: "POST",
        url: "/api/auth/admin/list-user-sessions",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(p.body)
    }),
    "POST /api/auth/admin/remove-user": (p: {
        body: {
            /** @description The user id */
            userId: string;
        };
    }) => ({
        method: "POST",
        url: "/api/auth/admin/remove-user",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(p.body)
    }),
    "POST /api/auth/admin/revoke-user-session": (p: {
        body: {
            /** @description The session token */
            sessionToken: string;
        };
    }) => ({
        method: "POST",
        url: "/api/auth/admin/revoke-user-session",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(p.body)
    }),
    "POST /api/auth/admin/revoke-user-sessions": (p: {
        body: {
            /** @description The user id */
            userId: string;
        };
    }) => ({
        method: "POST",
        url: "/api/auth/admin/revoke-user-sessions",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(p.body)
    }),
    "POST /api/auth/admin/set-role": (p: {
        body: {
            /** @description The user id */
            userId: string;
            /** @description The role to set, this can be a string or an array of strings. Eg: `admin` or `[admin, user]` */
            role: string | string[];
        };
    }) => ({
        method: "POST",
        url: "/api/auth/admin/set-role",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(p.body)
    }),
    "POST /api/auth/admin/set-user-password": (p: {
        body: {
            /** @description The new password */
            newPassword: string;
            /** @description The user id */
            userId: string;
        };
    }) => ({
        method: "POST",
        url: "/api/auth/admin/set-user-password",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(p.body)
    }),
    "POST /api/auth/admin/stop-impersonating": () => ({
        method: "POST",
        url: "/api/auth/admin/stop-impersonating"
    }),
    "POST /api/auth/admin/unban-user": (p: {
        body: {
            /** @description The user id */
            userId: string;
        };
    }) => ({
        method: "POST",
        url: "/api/auth/admin/unban-user",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(p.body)
    }),
    "POST /api/auth/admin/update-user": (p: {
        body: {
            /** @description The user id */
            userId: string;
            /** @description The user data to update */
            data: {
                [key: string]: unknown;
            };
        };
    }) => ({
        method: "POST",
        url: "/api/auth/admin/update-user",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(p.body)
    }),
    "POST /api/auth/callback/{id}": (p: {
        path: {
            id: string;
        };
        body?: {
            code?: string;
            error?: string;
            device_id?: string;
            error_description?: string;
            state?: string;
            user?: string;
            iss?: string;
        };
    }) => ({
        method: "POST",
        url: `/api/auth/callback/${p.path.id}`,
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(p.body)
    }),
    "POST /api/auth/change-email": (p: {
        body: {
            /** @description The new email address to set must be a valid email address */
            newEmail: string;
            /** @description The URL to redirect to after email verification */
            callbackURL?: string;
        };
    }) => ({
        method: "POST",
        url: "/api/auth/change-email",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(p.body)
    }),
    "POST /api/auth/change-password": (p: {
        body: {
            /** @description The new password to set */
            newPassword: string;
            /** @description The current password is required */
            currentPassword: string;
            /** @description Must be a boolean value */
            revokeOtherSessions?: boolean;
        };
    }) => ({
        method: "POST",
        url: "/api/auth/change-password",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(p.body)
    }),
    "POST /api/auth/delete-user": (p: {
        body?: {
            /** @description The callback URL to redirect to after the user is deleted */
            callbackURL?: string;
            /** @description The user's password. Required if session is not fresh */
            password?: string;
            /** @description The deletion verification token */
            token?: string;
        };
    }) => ({
        method: "POST",
        url: "/api/auth/delete-user",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(p.body)
    }),
    "POST /api/auth/get-access-token": (p: {
        body: {
            /** @description The Better Auth account ID */
            accountId: string;
            /** @description The user ID associated with the account */
            userId?: string;
        } | {
            /**
             * @description Select the current OAuth account from its signed cookie
             * @enum {unknown}
             */
            useAccountCookie: true;
            /** @description The user ID associated with the account */
            userId?: string;
        };
    }) => ({
        method: "POST",
        url: "/api/auth/get-access-token",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(p.body)
    }),
    "POST /api/auth/get-session": () => ({
        method: "POST",
        url: "/api/auth/get-session"
    }),
    "POST /api/auth/link-social": (p: {
        body: {
            /** @description The URL to redirect to after the user has signed in */
            callbackURL?: string;
            provider: ("apple" | "atlassian" | "cloudflare" | "cognito" | "discord" | "facebook" | "figma" | "github" | "microsoft" | "google" | "huggingface" | "slack" | "spotify" | "twitch" | "twitter" | "dropbox" | "kick" | "linear" | "linkedin" | "gitlab" | "tiktok" | "reddit" | "roblox" | "salesforce" | "vk" | "zoom" | "notion" | "kakao" | "naver" | "line" | "paybin" | "paypal" | "polar" | "railway" | "vercel" | "wechat") | string;
            idToken?: {
                token: string;
                nonce?: string;
                accessToken?: string;
                refreshToken?: string;
            };
            requestSignUp?: boolean;
            /** @description Additional scopes to request from the provider */
            scopes?: string[];
            /** @description The URL to redirect to if there is an error during the link process */
            errorCallbackURL?: string;
            /** @description Disable automatic redirection to the provider. Useful for handling the redirection yourself */
            disableRedirect?: boolean;
            /** @description The login hint to use for the authorization code request */
            loginHint?: string;
            /** @description Extra query parameters to append to the provider authorization URL (e.g. Cognito identity_provider, Google hd). */
            additionalParams?: {
                [key: string]: string;
            };
            additionalData?: {
                [key: string]: unknown;
            };
        };
    }) => ({
        method: "POST",
        url: "/api/auth/link-social",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(p.body)
    }),
    "POST /api/auth/refresh-token": (p: {
        body: {
            /** @description The Better Auth account ID */
            accountId: string;
            /** @description The user ID associated with the account */
            userId?: string;
        } | {
            /**
             * @description Select the current OAuth account from its signed cookie
             * @enum {unknown}
             */
            useAccountCookie: true;
            /** @description The user ID associated with the account */
            userId?: string;
        };
    }) => ({
        method: "POST",
        url: "/api/auth/refresh-token",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(p.body)
    }),
    "POST /api/auth/request-password-reset": (p: {
        body: {
            /** @description The email address of the user to send a password reset email to */
            email: string;
            /** @description The URL to redirect the user to reset their password. If the token isn't valid or expired, it'll be redirected with a query parameter `?error=INVALID_TOKEN`. If the token is valid, it'll be redirected with a query parameter `?token=VALID_TOKEN */
            redirectTo?: string;
        };
    }) => ({
        method: "POST",
        url: "/api/auth/request-password-reset",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(p.body)
    }),
    "POST /api/auth/reset-password": (p: {
        body: {
            /** @description The new password to set */
            newPassword: string;
            /** @description The token to reset the password */
            token?: string;
        };
    }) => ({
        method: "POST",
        url: "/api/auth/reset-password",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(p.body)
    }),
    "POST /api/auth/revoke-other-sessions": () => ({
        method: "POST",
        url: "/api/auth/revoke-other-sessions"
    }),
    "POST /api/auth/revoke-session": (p: {
        body?: {
            /** @description The token to revoke */
            token: string;
        };
    }) => ({
        method: "POST",
        url: "/api/auth/revoke-session",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(p.body)
    }),
    "POST /api/auth/revoke-sessions": () => ({
        method: "POST",
        url: "/api/auth/revoke-sessions"
    }),
    "POST /api/auth/send-verification-email": (p: {
        body?: {
            /**
             * @description The email to send the verification email to
             * @example user@example.com
             */
            email: string;
            /**
             * @description The URL to use for email verification callback
             * @example https://example.com/callback
             */
            callbackURL?: string | null;
        };
    }) => ({
        method: "POST",
        url: "/api/auth/send-verification-email",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(p.body)
    }),
    "POST /api/auth/sign-in/email": (p: {
        body: {
            /** @description Email of the user */
            email: string;
            /** @description Password of the user */
            password: string;
            /** @description Callback URL to use as a redirect for email verification */
            callbackURL?: string;
            /** @description If this is false, the session will not be remembered. Default is `true`. */
            rememberMe?: boolean;
        };
    }) => ({
        method: "POST",
        url: "/api/auth/sign-in/email",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(p.body)
    }),
    "POST /api/auth/sign-in/social": (p: {
        body: {
            /** @description Callback URL to redirect to after the user has signed in */
            callbackURL?: string;
            newUserCallbackURL?: string;
            /** @description Callback URL to redirect to if an error happens */
            errorCallbackURL?: string;
            provider: ("apple" | "atlassian" | "cloudflare" | "cognito" | "discord" | "facebook" | "figma" | "github" | "microsoft" | "google" | "huggingface" | "slack" | "spotify" | "twitch" | "twitter" | "dropbox" | "kick" | "linear" | "linkedin" | "gitlab" | "tiktok" | "reddit" | "roblox" | "salesforce" | "vk" | "zoom" | "notion" | "kakao" | "naver" | "line" | "paybin" | "paypal" | "polar" | "railway" | "vercel" | "wechat") | string;
            /** @description Disable automatic redirection to the provider. Useful for handling the redirection yourself */
            disableRedirect?: boolean;
            idToken?: {
                /** @description ID token from the provider */
                token: string;
                /** @description Nonce used to generate the token */
                nonce?: string;
                /** @description Access token from the provider */
                accessToken?: string;
                /** @description Refresh token from the provider */
                refreshToken?: string;
                /** @description Expiry date of the token */
                expiresAt?: number;
                /** @description The user object from the provider. Only available for some providers like Apple. */
                user?: {
                    name?: {
                        firstName?: string;
                        lastName?: string;
                    };
                    email?: string;
                };
            };
            /** @description Array of scopes to request from the provider. This will override the default scopes passed. */
            scopes?: string[];
            /** @description Explicitly request sign-up. Useful when disableImplicitSignUp is true for this provider */
            requestSignUp?: boolean;
            /** @description The login hint to use for the authorization code request */
            loginHint?: string;
            /** @description Extra query parameters to append to the provider authorization URL (e.g. Cognito identity_provider, Google hd). */
            additionalParams?: {
                [key: string]: string;
            };
            additionalData?: {
                [key: string]: unknown;
            };
        };
    }) => ({
        method: "POST",
        url: "/api/auth/sign-in/social",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(p.body)
    }),
    "POST /api/auth/sign-out": (p: {
        body?: {
            /** @description The URL to redirect to after provider logout */
            callbackURL?: string;
            /** @description Return the provider logout URL without redirecting */
            disableRedirect?: boolean;
            /** @description State to pass to the provider logout endpoint */
            state?: string;
        };
    }) => ({
        method: "POST",
        url: "/api/auth/sign-out",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(p.body)
    }),
    "POST /api/auth/sign-up/email": (p: {
        body?: {
            /** @description The name of the user */
            name: string;
            /** @description The email of the user */
            email: string;
            /** @description The password of the user */
            password: string;
            /** @description The profile image URL of the user */
            image?: string;
            /** @description The URL to use for email verification callback */
            callbackURL?: string;
            /** @description If this is false, the session will not be remembered. Default is `true`. */
            rememberMe?: boolean;
        };
    }) => ({
        method: "POST",
        url: "/api/auth/sign-up/email",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(p.body)
    }),
    "POST /api/auth/unlink-account": (p: {
        body: {
            /** @description The Better Auth account ID to unlink */
            accountId: string;
        };
    }) => ({
        method: "POST",
        url: "/api/auth/unlink-account",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(p.body)
    }),
    "POST /api/auth/update-session": (p: {
        body: {
            [key: string]: unknown;
        };
    }) => ({
        method: "POST",
        url: "/api/auth/update-session",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(p.body)
    }),
    "POST /api/auth/update-user": (p: {
        body?: {
            /** @description The name of the user */
            name?: string;
            /** @description The image of the user */
            image?: string | null;
        };
    }) => ({
        method: "POST",
        url: "/api/auth/update-user",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(p.body)
    }),
    "POST /api/auth/verify-password": (p: {
        body: {
            /** @description The password to verify */
            password: string;
        };
    }) => ({
        method: "POST",
        url: "/api/auth/verify-password",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(p.body)
    }),
    "POST /api/db/container-config": (p: {
        body: {
            id?: string;
            /** @enum {string} */
            id_type?: "name" | "id";
            user_id?: string;
        } | {
            id?: string;
            /** @enum {string} */
            id_type?: "name" | "id";
            user_id?: string;
        } | {
            id?: string;
            /** @enum {string} */
            id_type?: "name" | "id";
            user_id?: string;
        };
    }) => ({
        method: "POST",
        url: "/api/db/container-config",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(p.body)
    }),
    "POST /api/docker/containers/{id}/{action}": (p: {
        path: {
            id: string;
            action: "start" | "stop" | "restart" | "pause" | "unpause";
        };
    }) => ({
        method: "POST",
        url: `/api/docker/containers/${p.path.id}/${p.path.action}`
    }),
    "PUT /api/db/container-config": (p: {
        body: {
            id: string;
            /** @enum {string} */
            id_type?: "name" | "id";
            user_id?: string;
        } | {
            id: string;
            /** @enum {string} */
            id_type?: "name" | "id";
            user_id?: string;
        } | {
            id: string;
            /** @enum {string} */
            id_type?: "name" | "id";
            user_id?: string;
        };
    }) => ({
        method: "PUT",
        url: "/api/db/container-config",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(p.body)
    })
};
