from django.contrib.auth import get_user_model
from rest_framework import serializers

from .constants import ERROR, WARN
from .models import Job, Plan, PreflightResult, Product, Step, Version

User = get_user_model()


class IdOnlyField(serializers.CharField):
    def to_representation(self, value):
        return str(value.id)


class FullUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "username",
            "email",
            "valid_token_for",
            "org_name",
            "org_type",
            "is_staff",
        )


class LimitedUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("username", "is_staff")


class StepSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    kind = serializers.CharField(source="get_kind_display")

    class Meta:
        model = Step
        fields = (
            "id",
            "name",
            "description",
            "is_required",
            "is_recommended",
            "kind",
            "kind_icon",
        )


class PlanSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    version = serializers.PrimaryKeyRelatedField(
        read_only=True, pk_field=serializers.CharField()
    )
    is_allowed = serializers.SerializerMethodField()
    steps = serializers.SerializerMethodField()
    preflight_message = serializers.SerializerMethodField()

    class Meta:
        model = Plan
        fields = (
            "id",
            "title",
            "version",
            "preflight_message",
            "tier",
            "slug",
            "steps",
            "is_allowed",
            "is_listed",
        )

    def get_is_allowed(self, obj):
        return obj.is_visible_to(self.context["request"].user)

    # TODO: I would like to extract this logic into a CircumspectField:
    def get_steps(self, obj):
        if obj.is_visible_to(self.context["request"].user):
            return StepSerializer(obj.step_set, many=True).data
        return []

    # TODO: I would like to extract this logic into a CircumspectField:
    def get_preflight_message(self, obj):
        if obj.is_visible_to(self.context["request"].user):
            return obj.preflight_message_markdown
        return ""


class VersionSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    product = serializers.PrimaryKeyRelatedField(
        read_only=True, pk_field=serializers.CharField()
    )
    primary_plan = PlanSerializer()
    secondary_plan = PlanSerializer()
    additional_plans = PlanSerializer(many=True)

    class Meta:
        model = Version
        fields = (
            "id",
            "product",
            "label",
            "description",
            "created_at",
            "primary_plan",
            "secondary_plan",
            "additional_plans",
            "is_listed",
        )


class ProductSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    category = serializers.CharField(source="category.title")
    most_recent_version = VersionSerializer()
    is_allowed = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id",
            "title",
            "description",
            "category",
            "color",
            "icon",
            "image",
            "most_recent_version",
            "slug",
            "is_allowed",
            "is_listed",
            "order_key",
        )

    def get_is_allowed(self, obj):
        return obj.is_visible_to(self.context["request"].user)

    # TODO: I would like to extract this logic into a CircumspectField:
    def get_description(self, obj):
        if obj.is_visible_to(self.context["request"].user):
            return obj.description
        return ""


class ErrorWarningCountMixin:
    @staticmethod
    def _count_status_in_results(results, status_name):
        count = 0
        for val in results.values():
            for status in val:
                if status["status"] == status_name:
                    count += 1
        return count

    def get_error_count(self, obj):
        if obj.status == self.Meta.model.Status.started:
            return 0
        return self._count_status_in_results(obj.results, ERROR)

    def get_warning_count(self, obj):
        if obj.status == self.Meta.model.Status.started:
            return 0
        return self._count_status_in_results(obj.results, WARN)


class JobSerializer(ErrorWarningCountMixin, serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())
    org_name = serializers.SerializerMethodField()
    organization_url = serializers.SerializerMethodField()

    plan = serializers.PrimaryKeyRelatedField(
        queryset=Plan.objects.all(), pk_field=serializers.CharField()
    )
    steps = serializers.PrimaryKeyRelatedField(
        queryset=Step.objects.all(), many=True, pk_field=serializers.CharField()
    )
    error_count = serializers.SerializerMethodField()
    warning_count = serializers.SerializerMethodField()

    # Emitted fields:
    creator = serializers.SerializerMethodField()
    user_can_edit = serializers.SerializerMethodField()
    message = serializers.CharField(
        source="plan.post_install_message_markdown", read_only=True
    )

    class Meta:
        model = Job
        fields = (
            "id",
            "user",
            "creator",
            "plan",
            "steps",
            "organization_url",
            "results",
            "created_at",
            "edited_at",
            "enqueued_at",
            "job_id",
            "status",
            "org_name",
            "org_type",
            "error_count",
            "warning_count",
            "is_public",
            "user_can_edit",
            "message",
        )
        extra_kwargs = {
            "created_at": {"read_only": True},
            "edited_at": {"read_only": True},
            "enqueued_at": {"read_only": True},
            "results": {"read_only": True},
            "job_id": {"read_only": True},
            "status": {"read_only": True},
            "org_type": {"read_only": True},
        }

    def requesting_user_has_rights(self):
        """
        Does the user making the request have rights to see this object?

        The user is derived from the serializer context.
        """
        try:
            user = self.context["request"].user
            return user.is_staff or user == self.instance.user
        except (AttributeError, KeyError):
            return False

    def get_user_can_edit(self, obj):
        try:
            return obj.user == self.context["request"].user
        except (AttributeError, KeyError):
            return False

    def get_creator(self, obj):
        if self.requesting_user_has_rights():
            return LimitedUserSerializer(instance=obj.user).data
        return None

    def get_org_name(self, obj):
        if self.requesting_user_has_rights():
            return obj.org_name
        return None

    def get_organization_url(self, obj):
        if self.requesting_user_has_rights():
            return obj.organization_url
        return None

    @staticmethod
    def _has_valid_preflight(most_recent_preflight):
        if not most_recent_preflight:
            return False

        return not most_recent_preflight.has_any_errors()

    @staticmethod
    def _has_valid_steps(*, user, plan, steps, preflight):
        """
        Every set in this method is a set of numeric Step PKs, from the
        local database.
        """
        required_steps = set(plan.required_step_ids) - set(preflight.optional_step_ids)
        return not set(required_steps) - set(s.id for s in steps)

    def _get_from_data_or_instance(self, data, name, default=None):
        value = data.get(name, getattr(self.instance, name, default))
        # Handle the case where value is a *RelatedManager:
        if hasattr(value, "all") and callable(value.all):
            return value.all()
        return value

    def validate_plan(self, value):
        if not value.is_visible_to(self.context["request"].user):
            raise serializers.ValidationError(
                "You are not allowed to install this plan."
            )
        if not value.version.product.is_visible_to(self.context["request"].user):
            raise serializers.ValidationError(
                "You are not allowed to install this product."
            )
        return value

    def validate(self, data):
        user = self._get_from_data_or_instance(data, "user")
        plan = self._get_from_data_or_instance(data, "plan")
        steps = self._get_from_data_or_instance(data, "steps", default=[])
        most_recent_preflight = PreflightResult.objects.most_recent(
            user=user, plan=plan
        )
        no_valid_preflight = not self.instance and not self._has_valid_preflight(
            most_recent_preflight
        )
        if no_valid_preflight:
            raise serializers.ValidationError("No valid preflight.")
        invalid_steps = not self.instance and not self._has_valid_steps(
            user=user, plan=plan, steps=steps, preflight=most_recent_preflight
        )
        if invalid_steps:
            raise serializers.ValidationError("Invalid steps for plan.")
        data["org_name"] = user.org_name
        data["org_type"] = user.org_type
        data["organization_url"] = user.instance_url
        return data


class PreflightResultSerializer(ErrorWarningCountMixin, serializers.ModelSerializer):
    plan = IdOnlyField(read_only=True)
    is_ready = serializers.SerializerMethodField()
    error_count = serializers.SerializerMethodField()
    warning_count = serializers.SerializerMethodField()

    def get_is_ready(self, obj):
        return (
            obj.is_valid
            and obj.status == PreflightResult.Status.complete
            and self._count_status_in_results(obj.results, ERROR) == 0
        )

    class Meta:
        model = PreflightResult
        fields = (
            "id",
            "organization_url",
            "user",
            "plan",
            "created_at",
            "edited_at",
            "is_valid",
            "status",
            "results",
            "error_count",
            "warning_count",
            "is_ready",
        )
        extra_kwargs = {
            "organization_url": {"read_only": True},
            "created_at": {"read_only": True},
            "edited_at": {"read_only": True},
            "is_valid": {"read_only": True},
            "status": {"read_only": True},
            "results": {"read_only": True},
        }
