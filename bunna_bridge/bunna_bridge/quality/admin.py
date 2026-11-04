from django.contrib import admin

from .models import CuppingSession
from .models import CvaAssessment
from .models import PhysicalAnalysis
from .models import SessionGrader
from .models import SessionSample


@admin.register(CvaAssessment)
class CvaAdmin(admin.ModelAdmin):
    list_display = ["lot", "grader", "score", "status", "assessed_on"]
    list_filter = ["status"]
    readonly_fields = ["score"]


@admin.register(PhysicalAnalysis)
class PhysicalAdmin(admin.ModelAdmin):
    list_display = ["lot", "analysed_on", "moisture_pct", "water_activity", "sca_green_grade", "ecta_grade"]


class SampleInline(admin.TabularInline):
    model = SessionSample
    extra = 0


class GraderInline(admin.TabularInline):
    model = SessionGrader
    extra = 0


@admin.register(CuppingSession)
class SessionAdmin(admin.ModelAdmin):
    list_display = ["name", "owner", "held_on", "status", "blind"]
    inlines = [SampleInline, GraderInline]
