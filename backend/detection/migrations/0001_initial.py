"""Initial migration for DrishtiAI detection model"""
from django.db import migrations, models
import django.db.models.deletion
import django_currentuser.db.models.fields
import django_currentuser.middleware
from django.conf import settings


class Migration(migrations.Migration):
    initial = True
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]
    operations = [
        migrations.CreateModel(
            name='DetectionResult',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('image', models.ImageField(upload_to='detection/')),
                ('heatmap', models.ImageField(blank=True, null=True, upload_to='heatmaps/')),
                ('verdict', models.CharField(choices=[
                    ('FAKE','Fake'),('REAL','Real'),('SUSPICIOUS','Suspicious'),
                    ('NO_FACE','No Face'),('UNKNOWN','Unknown')],
                    default='UNKNOWN', max_length=20)),
                ('is_fake', models.BooleanField(blank=True, null=True)),
                ('confidence_score', models.FloatField(blank=True, null=True)),
                ('decision_score', models.FloatField(blank=True, null=True)),
                ('model_results', models.JSONField(blank=True, null=True)),
                ('ensemble_score', models.FloatField(blank=True, null=True)),
                ('status', models.CharField(choices=[
                    ('pending','Pending'),('completed','Completed'),('failed','Failed')],
                    default='pending', max_length=20)),
                ('model_version', models.CharField(default='multi_v1', max_length=50)),
                ('processing_time', models.FloatField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('modified_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='detections',
                    to=settings.AUTH_USER_MODEL)),
                ('created_by', django_currentuser.db.models.fields.CurrentUserField(
                    default=django_currentuser.middleware.get_current_authenticated_user,
                    null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    on_update=False,
                    related_name='detectionresult_created',
                    to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ('-created_at',)},
        ),
    ]
