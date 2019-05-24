from __future__ import unicode_literals
from django import template
from django.contrib.admin.utils import quote
from django.urls import NoReverseMatch, reverse
from jet.dashboard.utils import get_current_dashboard

register = template.Library()
assignment_tag = register.assignment_tag if hasattr(register, 'assignment_tag') else register.simple_tag


@assignment_tag(takes_context=True)
def get_dashboard(context, location):
    dashboard_cls = get_current_dashboard(location)

    app_label = context['request'].resolver_match.kwargs.get('app_label')

    return dashboard_cls(context, app_label=app_label)


@register.filter
def format_change_message(log_entry):
    # Django 1.10+
    if hasattr(log_entry, 'get_change_message'):
        return log_entry.get_change_message()
    else:
        return log_entry.change_message


@register.filter
def tt_admin_url(item):
    """
    This is a sad hack so the recent actions work with our custom 'ttadmin'
    site instead of default.
    """
    if item.content_type and item.object_id:
        ct = (item.content_type.app_label, item.content_type.model)
        # Try our special edit-redirect URL for articles
        if ct[0] == 'articles' and ct[1] == 'article':
            try:
                return reverse('ttadmin:%s_%s_edit_redirect' % ct,
                               args=(quote(item.object_id),))
            except NoReverseMatch:
                # can't find it, so just use default change view
                pass
        # Custom redirect didn't work, so just go to default change view.
        try:
            return reverse('ttadmin:%s_%s_change' % ct,
                           args=(quote(item.object_id),))
        except NoReverseMatch:
            pass
    return None
