from django.conf.urls import patterns, include, url
from django.contrib import admin

urlpatterns = patterns('',
    # Examples:
    # url(r'^$', 'api.views.home', name='home'),
    # url(r'^blog/', include('blog.urls')),
 	#url(r'^home/','analytics.views.home')
    url(r'^valid/','analytics.views.valid_check'),
    url(r'^data/','analytics.views.data_view'),
    url(r'^chart/','analytics.views.chart_view'),
    url(r'^sheet/','analytics.views.sheet_names'),
)
