ALTER TABLE "system"."event"
    ALTER COLUMN "identity_id" SET DEFAULT
        coalesce(
            current_setting('tenant.identity_id', true)::uuid,
            '00000000-0000-0000-0000-000000000000'
        ),

    ALTER COLUMN "transaction_id" SET DEFAULT
        coalesce(
            nullif(current_setting('system.transaction_id', true), '')::uuid,
            set_config('system.transaction_id', "system".uuid_generate_v4()::text, true)::uuid
        );
