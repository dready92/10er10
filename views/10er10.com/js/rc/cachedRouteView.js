'use strict';

(function() {

angular.module("d10cachedRouteView",[]).directive('d10View', ngViewFactory);

/**
 * @ngdoc directive
 * @name ngRoute.directive:ngView
 * @restrict ECA
 *
 * @description
 * # Overview
 * `ngView` is a directive that complements the {@link ngRoute.$route $route} service by
 * including the rendered template of the current route into the main layout (`index.html`) file.
 * Every time the current route changes, the included view changes with it according to the
 * configuration of the `$route` service.
 *
 * Additionally, you can also provide animations via the ngAnimate attribute to animate the **enter**
 * and **leave** effects.
 *
 * @animations
 * enter - happens just after the ngView contents are changed (when the new view DOM element is inserted into the DOM)
 * leave - happens just after the current ngView contents change and just before the former contents are removed from the DOM
 *
 * @scope
 * @example
    <example module="ngViewExample" deps="angular-route.js" animations="true">
      <file name="index.html">
        <div ng-controller="MainCntl as main">
          Choose:
          <a href="Book/Moby">Moby</a> |
          <a href="Book/Moby/ch/1">Moby: Ch1</a> |
          <a href="Book/Gatsby">Gatsby</a> |
          <a href="Book/Gatsby/ch/4?key=value">Gatsby: Ch4</a> |
          <a href="Book/Scarlet">Scarlet Letter</a><br/>

          <div
            ng-view
            class="example-animate-container"
            ng-animate="{enter: 'example-enter', leave: 'example-leave'}"></div>
          <hr />

          <pre>$location.path() = {{main.$location.path()}}</pre>
          <pre>$route.current.templateUrl = {{main.$route.current.templateUrl}}</pre>
          <pre>$route.current.params = {{main.$route.current.params}}</pre>
          <pre>$route.current.scope.name = {{main.$route.current.scope.name}}</pre>
          <pre>$routeParams = {{main.$routeParams}}</pre>
        </div>
      </file>

      <file name="book.html">
        <div>
          controller: {{book.name}}<br />
          Book Id: {{book.params.bookId}}<br />
        </div>
      </file>

      <file name="chapter.html">
        <div>
          controller: {{chapter.name}}<br />
          Book Id: {{chapter.params.bookId}}<br />
          Chapter Id: {{chapter.params.chapterId}}
        </div>
      </file>

      <file name="animations.css">
        .example-leave, .example-enter {
          -webkit-transition:all cubic-bezier(0.250, 0.460, 0.450, 0.940) 1.5s;
          -moz-transition:all cubic-bezier(0.250, 0.460, 0.450, 0.940) 1.5s;
          -ms-transition:all cubic-bezier(0.250, 0.460, 0.450, 0.940) 1.5s;
          -o-transition:all cubic-bezier(0.250, 0.460, 0.450, 0.940) 1.5s;
          transition:all cubic-bezier(0.250, 0.460, 0.450, 0.940) 1.5s;
        }

        .example-animate-container {
          position:relative;
          height:100px;
        }

        .example-animate-container > * {
          display:block;
          width:100%;
          border-left:1px solid black;

          position:absolute;
          top:0;
          left:0;
          right:0;
          bottom:0;
          padding:10px;
        }

        .example-enter {
          left:100%;
        }
        .example-enter.example-enter-active {
          left:0;
        }

        .example-leave { }
        .example-leave.example-leave-active {
          left:-100%;
        }
      </file>

      <file name="script.js">
        angular.module('ngViewExample', ['ngRoute'], function($routeProvider, $locationProvider) {
          $routeProvider.when('/Book/:bookId', {
            templateUrl: 'book.html',
            controller: BookCntl,
            controllerAs: 'book'
          });
          $routeProvider.when('/Book/:bookId/ch/:chapterId', {
            templateUrl: 'chapter.html',
            controller: ChapterCntl,
            controllerAs: 'chapter'
          });

          // configure html5 to get links working on jsfiddle
          $locationProvider.html5Mode(true);
        });

        function MainCntl($route, $routeParams, $location) {
          this.$route = $route;
          this.$location = $location;
          this.$routeParams = $routeParams;
        }

        function BookCntl($routeParams) {
          this.name = "BookCntl";
          this.params = $routeParams;
        }

        function ChapterCntl($routeParams) {
          this.name = "ChapterCntl";
          this.params = $routeParams;
        }
      </file>

      <file name="scenario.js">
        it('should load and compile correct template', function() {
          element('a:contains("Moby: Ch1")').click();
          var content = element('.doc-example-live [ng-view]').text();
          expect(content).toMatch(/controller\: ChapterCntl/);
          expect(content).toMatch(/Book Id\: Moby/);
          expect(content).toMatch(/Chapter Id\: 1/);

          element('a:contains("Scarlet")').click();
          content = element('.doc-example-live [ng-view]').text();
          expect(content).toMatch(/controller\: BookCntl/);
          expect(content).toMatch(/Book Id\: Scarlet/);
        });
      </file>
    </example>
 */


/**
 * @ngdoc event
 * @name ngRoute.directive:ngView#$viewContentLoaded
 * @eventOf ngRoute.directive:ngView
 * @eventType emit on the current ngView scope
 * @description
 * Emitted every time the ngView content is reloaded.
 */
ngViewFactory.$inject = ['$route', '$anchorScroll', '$compile', '$controller', '$animator'];
function ngViewFactory(   $route,   $anchorScroll,   $compile,   $controller,   $animator) {
  return {
    restrict: 'ECA',
    terminal: true,
    link: function(scope, element, attr) {
      var lastScope,
          onloadExp = attr.onload || '',
          animate = $animator(scope, attr);
      var controllersCache = {};
      var lastControllerCache = {};
      
      scope.$on('$routeChangeSuccess', update);
      update();


      function destroyLastScope(shouldCachePrevious) {
        if (lastScope && !shouldCachePrevious ) {
          lastScope.$destroy();
          lastScope = null;
        }
      }

      function clearContent(shouldCachePrevious) {
        if ( shouldCachePrevious ) {
          lastControllerCache.widget.detach();
        } else {
          debug("animate.leave on ",element);
          animate.leave(element.contents(), element);
          destroyLastScope(shouldCachePrevious);
        }
      }

      function update() {
        var locals = $route.current && $route.current.locals,
            routeDef = $route.current && $route.current.$$route,
            template = locals && locals.$template;
        var current = $route.current;
        debug("current: ",$route.current);
        debug("routeDef: ",routeDef);
        
        var shouldCacheCurrent = false;
        if ( routeDef && routeDef.cache ) {
          shouldCacheCurrent = true;
        }
        
        var shouldCachePrevious = false;
        if ( lastControllerCache.routeDef &&
            "cache" in lastControllerCache.routeDef &&
            lastControllerCache.routeDef.cache ) {
          shouldCachePrevious = true;
        }
        
        debug("shouldCachePrevious:",shouldCachePrevious,"shouldCacheCurrent:",shouldCacheCurrent);
        
        if (template) {
          clearContent(shouldCachePrevious);
          var enterElements ;
          if ( current.controller && controllersCache[current.controller] ) {
            debug("Using controller from cache", current.controller);
            lastControllerCache = controllersCache[current.controller];
            enterElements = lastControllerCache.widget;
            lastControllerCache.scope.$emit("$attach");
            animate.enter(enterElements, element);
            return ;
          } else {
            enterElements = angular.element('<div></div>').html(template).contents();
          }
          debugger;
          animate.enter(enterElements, element);

          var link = $compile(enterElements),
              controller;

          lastScope = current.scope = scope.$new();
          if (current.controller) {
            locals.$scope = lastScope;
            controller = $controller(current.controller, locals);
            if (current.controllerAs) {
              lastScope[current.controllerAs] = controller;
            }
            element.children().data('$ngControllerController', controller);
          }

          link(lastScope);
          lastScope.$emit('$viewContentLoaded');
          lastScope.$eval(onloadExp);

          if ( shouldCacheCurrent && current.controller ) {
            lastControllerCache = {
              controller: controller,
              widget: element.children(),
              scope: lastScope,
              routeDef: routeDef
            };
            controllersCache[current.controller] = lastControllerCache;
          }
          
          // $anchorScroll might listen on event...
          $anchorScroll();
        } else {
          clearContent();
        }
      }
    }
  };
}

})();