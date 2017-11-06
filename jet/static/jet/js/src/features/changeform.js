var $ = require('jquery');
var t = require('../utils/translate');

var ChangeForm = function($changeForm) {
    this.$changeForm = $changeForm;
};

ChangeForm.prototype = {
    changeDetected: false,
    onWindowBeforeUnload: function() {
        return t('Warning: you have unsaved changes');
    },
    onFormInputChanged: function($inputs) {
        $inputs.off('change', this.onFormInputChanged);

        if (!self.changeDetected) {
            $(window).bind('beforeunload', this.onWindowBeforeUnload);
        }

        this.changeDetected = true;
    },
    initUnsavedChangesWarning: function($changeForm) {
        var self = this;
        var $form = $changeForm.find('#content-main form');

        if ($form.length == 0) {
            return;
        }

        var $inputs = $form.find('input, textarea, select');

        $(document).on('submit', 'form', function() {
            self.storeUrlValuesForDjangoCms();
            $(window).off('beforeunload', self.onWindowBeforeUnload);
        });

        $inputs.on('change', $.proxy(this.onFormInputChanged, this, $inputs));
    },
    run: function() {
        try {
            this.initUnsavedChangesWarning(this.$changeForm);
        } catch (e) {
            console.error(e, e.stack);
        }
    },
    /**
      Because's of Jet's very JavaScript-y form widgets,
      we have to serialize the form before grabbing the pub date.
      (Simply using .val() doesn't reflect changes made after the
      page loads.) Then, we store the pub date and slug in a global
      object so the URL can be updated when reloading the meta sideframe.
    */
    storeUrlValuesForDjangoCms: function() {
      var $form = $('#article_form');

      if ($form) {
        var formData = $form.serializeArray();
        var pubDate;

        formData.forEach(function(datum) {
          if (datum.name === 'pub_date_0') {
            pubDate = datum.value;
            return false;
          }
        });

        window.parent.TT_SIDEFRAME_META = {
          slug: $('#id_slug').val(),
          pubDate: pubDate
        };
      }
    }
};

$(document).ready(function() {
    // skip confirmation box in Django CMS plugin views
    // these are usually at /add-plugin/ or /edit-plugin/
    if (window.location.pathname.indexOf('-plugin/') === -1) {
      $('.change-form').each(function() {
          new ChangeForm($(this)).run();
      });
    }
});
