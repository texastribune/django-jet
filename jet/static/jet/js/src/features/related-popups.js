var $ = require('jquery');
var WindowStorage = require('../utils/window-storage');

var RelatedPopups = function() {
    this.windowStorage = new WindowStorage('relatedWindows');
};

RelatedPopups.prototype = {
    updateLinks: function($select) {
        $select.find('~ .change-related, ~ .delete-related, ~ .add-another').each(function() {
            var $link = $(this);
            var hrefTemplate = $link.data('href-template');

            if (hrefTemplate == undefined) {
                return;
            }

            var value = $select.val();

            if (value) {
                $link.attr('href', hrefTemplate.replace('__fk__', value))
            } else {
                $link.removeAttr('href');
            }
        });
    },
    initLinksForRow: function($row) {
        if ($row.data('related-popups-links-initialized')) {
            return;
        }

        var self = this;

        $row.find('select').each(function() {
            var $select = $(this);

            self.updateLinks($select);

            $select.find('~ .add-related, ~ .change-related, ~ .delete-related, ~ .add-another').each(function() {
                var $link = $(this);

                $link.on('click', function(e) {
                    e.preventDefault();

                    var href = $link.attr('href');

                    if (href != undefined) {
                        if (href.indexOf('_popup') == -1) {
                            href += (href.indexOf('?') == -1) ? '?_popup=1' : '&_popup=1';
                        }

                        self.showPopup($select, href);
                    }
                });
            });
        }).on('change', function() {
            self.updateLinks($(this));
        });

        $row.find('input').each(function() {
            var $input = $(this);

            $input.find('~ .related-lookup').each(function() {
                var $link = $(this);

                $link.on('click', function(e) {
                    e.preventDefault();

                    var href = $link.attr('href');

                    href += (href.indexOf('?') == -1) ? '?_popup=1' : '&_popup=1';

                    self.showPopup($input, href);
                });
            });
        });

        $row.data('related-popups-links-initialized', true);
    },
    initLinks: function() {
        var self = this;

        $('.form-row').each(function() {
            self.initLinksForRow($(this));
        });

        $('.inline-group').on('inline-group-row:added', function(e, $inlineItem) {
            $inlineItem.find('.form-row').each(function() {
                self.initLinksForRow($(this));
            });
        });
    },
    initPopupBackButton: function() {
      var self = this;

      $('.related-popup-back').on('click', function(e) {
          e.preventDefault();
          self.closePopup();
      });

      $('.related-popup-container').on('click', function(e) {
        if ($(e.target).hasClass('related-popup-container')) {
          self.closeOverlayOnClick();
        }
      });
    },
    showPopup: function($input, href) {
        var $document = $(window.top.document);
        var $container = $document.find('.related-popup-container');
        var $loading = $container.find('.loading-indicator');
        var $body = $document.find('body');
        var $popup = $('<div>')
            .addClass('related-popup')
            .data('input', $input);
        var $iframe = $('<iframe>')
            .attr('src', href)
            .on('load', function() {
                $popup.add($document.find('.related-popup-back')).fadeIn(200, 'swing', function() {
                    $loading.hide();
                });
            });

        $popup.append($iframe);
        $loading.show();
        $document.find('.related-popup').add($document.find('.related-popup-back')).fadeOut(200, 'swing');
        $container.fadeIn(200, 'swing', function() {
            $container.append($popup);
        });
        $body.addClass('non-scrollable');
    },
    closePopup: function(response) {
      var previousWindow = this.windowStorage.previous();
      var self = this;

      function init($) {
          var $document = $(window.top.document);
          var $popups = $document.find('.related-popup');
          var $container = $document.find('.related-popup-container');
          var $popup = $popups.last();
          var $sideframeClose = $document.find('.cms-sideframe-close');

          if (response != undefined) {
            // if DjangoCMS meta sideframe exists
            if ($popup.length === 0 && $sideframeClose.length === 1) {
                // add class to indicate a confirmation box isn't needed
                $sideframeClose.addClass('trib-is-form-submission');
                $sideframeClose.trigger('click.cms.sideframe');

                var parentLoc = window.top.location;

                /**
                  If the story is not published, update the URL
                  in browser address bar with updated slug and
                  pub date before refreshing.
                */
                if (parentLoc.pathname.indexOf('preview') !== -1) {
                  var formMeta = window.parent.TT_SIDEFRAME_META;
                  var urlParts = [
                    parentLoc.protocol,
                    '//',
                    parentLoc.host,
                    '/',
                    formMeta.pubDate.replace(/-/g, '/'),
                    '/',
                    formMeta.slug,
                    '/preview/',
                    parentLoc.search
                  ];

                  window.top.location.href = urlParts.join('');
                } else {
                  window.top.location.reload();
                }
            } else {
                self.processPopupResponse($popup, response);
            }
          }

          self.windowStorage.pop();

          if ($popups.length == 1) {
              $container.fadeOut(200, 'swing', function() {
                  $document.find('.related-popup-back').hide();
                  $document.find('body').removeClass('non-scrollable');
                  $popup.remove();
              });
          } else if ($popups.length > 1) {
              $popup.remove();
              $popups.eq($popups.length - 2).show();
          }
      }

      try {
        init(previousWindow.jet.jQuery);
      } catch (e) {
        init($);
      }
    },
    closeOverlayOnClick: function() {
      var self = this;
      var previousWindow = this.windowStorage.previous();

      (function($) {
        var $document = $(window.top.document);
        var $container = $document.find('.related-popup-container');

        $container
          .append($('<p/>'))
          .text('There was an error. Save your work!')
          .css({
            color: 'white',
            'text-align': 'center',
            'font-size': '40px',
            'font-weight': 'bold',
            'padding-top': '100px'
          });

        self.windowStorage.pop();

        setTimeout(function() {
          $container.fadeOut(200, 'swing', function() {
              $document.find('.related-popup-back').hide();
              $document.find('body').removeClass('non-scrollable');
              $('.related-popup').remove();
              self.windowStorage = new WindowStorage('relatedWindows');
              self.run();
          });
        }, 5000);
      })(previousWindow ? previousWindow.jet.jQuery : $);
    },
    findPopupResponse: function() {
        var self = this;

        $('#django-admin-popup-response-constants').each(function() {
            var $constants = $(this);
            var response = $constants.data('popup-response');

            self.closePopup(response);
        });
    },
    processPopupResponse: function($popup, response) {
        var $input = $popup.data('input');

        switch (response.action) {
            case 'change':
                $input.find('option').each(function() {
                    var $option = $(this);

                    if ($option.val() == response.value) {
                        $option.html(response.obj).val(response.new_value);
                    }
                });

                $input.trigger('change').trigger('select:init');

                break;
            case 'delete':
                $input.find('option').each(function() {
                    var $option = $(this);

                    if ($option.val() == response.value) {
                        $option.remove();
                    }
                });

                $input.trigger('change').trigger('select:init');

                break;
            default:
                if ($input.is('select')) {
                    var $option = $('<option>')
                        .val(response.value)
                        .html(response.obj);

                    $input.append($option);
                    $option.attr('selected', true);

                    $input
                        .trigger('change')
                        .trigger('select:init');
                } else if ($input.is('input.vManyToManyRawIdAdminField') && $input.val()) {
                    $input.val($input.val() + ',' + response.value);
                    $input.trigger('change');
                } else if ($input.is('input')) {
                    $input.val(response.value);
                    $input.trigger('change');
                }

                break;
        }
    },
    overrideRelatedGlobals: function() {
        var self = this;

        window.showRelatedObjectLookupPopup
            = window.showAddAnotherPopup
            = window.showRelatedObjectPopup
            = function() { };

        window.opener = this.windowStorage.previous() || window.opener;
        window.dismissRelatedLookupPopup = function(win, chosenId) {
            self.closePopup({
                action: 'lookup',
                value: chosenId
            });
        };
    },
    initDeleteRelatedCancellation: function() {
        var self = this;

        $('.popup.delete-confirmation .cancel-link').on('click', function(e) {
            e.preventDefault();
            self.closePopup();
        }).removeAttr('onclick');
    },
    initLookupLinks: function() {
        var self = this;

        $("a[data-popup-opener]").click(function(e) {
            e.preventDefault();

            self.closePopup({
                action: 'lookup',
                value: $(this).data("popup-opener")
            });
        });
    },
    run: function() {
        this.windowStorage.push(window);

        try {
            this.initLinks();
            this.initPopupBackButton();
            this.findPopupResponse();
            this.overrideRelatedGlobals();
            this.initDeleteRelatedCancellation();
            this.initLookupLinks();
        } catch (e) {
            console.error(e, e.stack);
        }
    }
};

$(document).ready(function() {
    new RelatedPopups().run();
});
