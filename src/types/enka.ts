interface PrivacySettingInfo {
    displayCollection?: boolean
    displayRecord?: boolean
    displayRecordTeam?: boolean
    displayOnlineStatus?: boolean
    displayDiary?: boolean
}

interface RecordInfo {
    achievementCount?: number
    bookCount?: number
    avatarCount?: number
    equipmentCount?: number
    musicCount?: number
    relicCount?: number
    challengeInfo?: unknown
    maxRogueChallengeScore?: number
}


interface SubAffix {
    affixId: number
    cnt: number
    step?: number
}

interface FlatProp {
    type: string
    value: number
}

interface RelicFlat {
    props?: FlatProp[]
    setName?: string | number
    setID?: number
}

interface Relic {
    mainAffixId: number
    subAffixList?: SubAffix[]
    tid: number
    type: number
    level: number
    _flat?: RelicFlat
}

interface SkillTree {
    pointId: number
    level: number
}

interface EquipmentFlat {
    props?: FlatProp[]
    name?: string | number
}

interface Equipment {
    rank?: number
    tid: number
    promotion?: number
    level: number
    _flat?: EquipmentFlat
}

export interface AvatarEnkaDetail {
    relicList?: Relic[]
    level: number
    promotion?: number
    rank?: number
    skillTreeList?: SkillTree[]
    equipment?: Equipment
    avatarId: number
    _assist?: boolean
    pos?: number
}

interface DetailInfo {
    worldLevel?: number
    privacySettingInfo?: PrivacySettingInfo
    headIcon?: number
    signature?: string
    avatarDetailList?: AvatarEnkaDetail[]
    platform?: string
    recordInfo?: RecordInfo
    uid: number
    level: number
    nickname: string
    isDisplayAvatar?: boolean
    friendCount?: number
    personalCardId?: number
}

export interface EnkaResponse {
    detailInfo: DetailInfo
    ttl: number
    uid: string
}

/** Why an enka.network lookup failed, as reported by our own /api/enka route. */
export type EnkaErrorCode =
    | "INVALID_UID"
    | "NOT_FOUND"
    | "RATE_LIMIT"
    | "NOT_READY"
    | "UPSTREAM"
    | "NETWORK"

export type EnkaProxySuccess = {
    ok: true
    ttl: number
    data: EnkaResponse
}

export type EnkaProxyFailure = {
    ok: false
    code: EnkaErrorCode
    message: string
}

export type EnkaProxyResponse = EnkaProxySuccess | EnkaProxyFailure
