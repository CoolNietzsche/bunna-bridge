from rest_framework import serializers

from bunna_bridge.lots.models import CoffeeLot
from bunna_bridge.lots.models import Offer

from .models import RoastBatch, RoastBatchLot, RoastEquipment


class RoastEquipmentSerializer(serializers.ModelSerializer):
    class Meta:
        model  = RoastEquipment
        fields = [
            "id", "name", "machine_type", "brand",
            "batch_capacity_kg", "installed_date",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class RoastBatchLotSerializer(serializers.ModelSerializer):
    lot_id_display = serializers.CharField(source="lot.lot_id", read_only=True)
    lot_name       = serializers.CharField(source="lot.name", read_only=True)

    class Meta:
        model  = RoastBatchLot
        fields = ["id", "lot", "lot_id_display", "lot_name", "quantity_kg"]
        read_only_fields = ["id"]


def _lot_is_available_to_roaster(lot, roaster):
    """
    A roaster may roast a green lot if they own/export it themselves, or if
    they've bought it (an accepted Offer) from another exporter. CoffeeLot
    has no post-purchase ownership transfer, so "accepted offer" is the only
    signal that a roaster legitimately holds some of that lot's coffee.
    """
    return lot.exporter_id == roaster.id or Offer.objects.filter(
        buyer=roaster, lot=lot, status="accepted",
    ).exists()


class RoastBatchSerializer(serializers.ModelSerializer):
    lot_inputs       = RoastBatchLotSerializer(many=True)
    input_weight_kg  = serializers.ReadOnlyField()
    weight_loss_pct  = serializers.ReadOnlyField()
    equipment_name   = serializers.CharField(source="equipment.name", read_only=True, default=None)

    class Meta:
        model  = RoastBatch
        fields = [
            "id", "batch_code", "equipment", "equipment_name", "status", "roast_date",
            "roast_level", "charge_temp_c", "drop_temp_c",
            "first_crack_time_s", "development_time_s",
            "output_weight_kg", "input_weight_kg", "weight_loss_pct",
            "qc_score", "qc_notes", "notes",
            "lot_inputs",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "status", "created_at", "updated_at"]

    def validate_lot_inputs(self, value):
        if not value:
            raise serializers.ValidationError("At least one green lot is required.")
        roaster = self.context["request"].user
        for line in value:
            lot = line["lot"]
            if not _lot_is_available_to_roaster(lot, roaster):
                raise serializers.ValidationError(
                    f"Lot {lot.lot_id} isn't yours to roast — you neither exported it "
                    "nor have an accepted offer on it."
                )
        return value

    def create(self, validated_data):
        lot_inputs = validated_data.pop("lot_inputs")
        batch = RoastBatch.objects.create(**validated_data)
        RoastBatchLot.objects.bulk_create([
            RoastBatchLot(batch=batch, lot=line["lot"], quantity_kg=line["quantity_kg"])
            for line in lot_inputs
        ])
        return batch

    def update(self, instance, validated_data):
        lot_inputs = validated_data.pop("lot_inputs", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if lot_inputs is not None:
            instance.lot_inputs.all().delete()
            RoastBatchLot.objects.bulk_create([
                RoastBatchLot(batch=instance, lot=line["lot"], quantity_kg=line["quantity_kg"])
                for line in lot_inputs
            ])
        return instance


class AvailableLotSerializer(serializers.ModelSerializer):
    class Meta:
        model  = CoffeeLot
        fields = ["id", "lot_id", "name", "region", "grade", "volume_kg"]
