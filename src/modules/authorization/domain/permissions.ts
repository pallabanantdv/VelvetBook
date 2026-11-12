export type CustomerPermission =
  | {
      readonly scope: "customer";
      readonly resource: "discovery";
      readonly action: "search";
    }
  | {
      readonly scope: "customer";
      readonly resource: "availability";
      readonly action: "read";
    }
  | {
      readonly scope: "customer";
      readonly resource: "favorite";
      readonly action: "read" | "manage";
    }
  | {
      readonly scope: "customer";
      readonly resource: "negotiation";
      readonly action: "read" | "offer" | "accept";
    }
  | {
      readonly scope: "customer";
      readonly resource: "review";
      readonly action: "read" | "create";
    }
  | {
      readonly scope: "customer";
      readonly resource: "conversation";
      readonly action: "read" | "send";
    }
  | {
      readonly scope: "customer";
      readonly resource: "profile";
      readonly action: "read" | "update";
    }
  | {
      readonly scope: "customer";
      readonly resource: "booking";
      readonly action: "create" | "read" | "cancel" | "reschedule";
    }
  | {
      readonly scope: "customer";
      readonly resource: "payment";
      readonly action: "read";
    };

export type OrganizationPermission =
  | {
      readonly scope: "organization";
      readonly resource: "negotiation";
      readonly action: "read" | "offer" | "accept";
    }
  | {
      readonly scope: "organization";
      readonly resource: "conversation";
      readonly action: "read" | "send";
    }
  | {
      readonly scope: "organization";
      readonly resource: "deal";
      readonly action: "read" | "manage";
    }
  | {
      readonly scope: "organization";
      readonly resource: "onboarding";
      readonly action: "read" | "update" | "submit";
    }
  | {
      readonly scope: "organization";
      readonly resource: "organization";
      readonly action: "read" | "update";
    }
  | {
      readonly scope: "organization";
      readonly resource: "membership";
      readonly action: "read" | "manage";
    }
  | {
      readonly scope: "organization";
      readonly resource: "store";
      readonly action: "read" | "create" | "update";
    }
  | {
      readonly scope: "organization";
      readonly resource: "catalog";
      readonly action: "read" | "manage";
    }
  | {
      readonly scope: "organization";
      readonly resource: "staff";
      readonly action: "read" | "manage";
    }
  | {
      readonly scope: "organization";
      readonly resource: "booking";
      readonly action: "read" | "manage" | "update_assigned";
    }
  | {
      readonly scope: "organization";
      readonly resource: "payment";
      readonly action: "read";
    }
  | {
      readonly scope: "organization";
      readonly resource: "audit";
      readonly action: "read";
    };

export type PlatformPermission =
  | {
      readonly scope: "platform";
      readonly resource: "onboarding";
      readonly action: "read" | "review";
    }
  | {
      readonly scope: "platform";
      readonly resource: "organization";
      readonly action: "read" | "suspend";
    }
  | {
      readonly scope: "platform";
      readonly resource: "user";
      readonly action: "read" | "disable";
    }
  | {
      readonly scope: "platform";
      readonly resource: "audit";
      readonly action: "read";
    };

export type Permission =
  CustomerPermission | OrganizationPermission | PlatformPermission;
