(function($){

	$(document).ready(function(){

		var $getWebcamBtn = $('#get-webcam-btn');
		var video; // $('<video>')
		var $videoPlaceholder = $('#video-placeholder');
		var $takePhotoBtn = $('#take-photo-btn');
		var $galleryList = $('#gallery-list');
		var $deleteAllGalleryItemsBtn = $('.js--delete-all-gallery-items');
		var $imageEditorModal = $('#image-editor-modal');

		var canvasEditor = (function(){
			var canvas = null;
			var $canvas = null;
			var filters = {};
			var image = null;
			var drawingTimestamp = null;
			var drawingPaths = {};
			var defaultBrushWeight = 5;
			var defaultBrushColor = '#000000';
			var $brushWeightControl = $('#canvas-editor-drawing-brush-weight');
			var $brushColorControl = $('#canvas-editor-drawing-brush-color');
			var cursorRedraw = true;

			$brushWeightControl.on('change', function() {
				setCursorRedraw();
			});

			$brushColorControl.on('change', function() {
				setCursorRedraw();
			});

			var init = function (canvasToEdit){
				canvas = canvasToEdit;
				
				filters = {};
				image = null;
				drawingPaths = {};
				cursorRedraw = true;

				$canvas = $(canvas);

				$canvas.on('mousedown', function (evt) {
					var currentDate = new Date();
					drawingTimestamp = currentDate.getTime();

					var cursorPosition = getMouseCursorPositionFromEvent(evt);

					addDrawingPoint(cursorPosition.x, cursorPosition.y);

					redraw();
				});

				$canvas.on('mousemove', function (evt) {
					if (null !== drawingTimestamp) {
						var cursorPosition = getMouseCursorPositionFromEvent(evt);

						addDrawingPoint(cursorPosition.x, cursorPosition.y);

						redraw();
					}

					updateCursor();
				});

				$canvas.on('mouseup', function (evt) {
					drawingTimestamp = null;
				});

				$canvas.on('mouseleave', function (evt) {
					drawingTimestamp = null;
				});
			};

			var getCanvasDataUrl = function () {
				return canvas.toDataURL();
			};

			var getCanvasDimensions = function () {
				return {
					width: canvas.width,
					height: canvas.height
				};
			};

			var setCursorRedraw = function (){
				cursorRedraw = true;
			};

			var updateCursor = function () {
				if (cursorRedraw) {
					console.log('cursor drawing');
					cursorRedraw = false;

					var canvas = document.createElement('canvas');
					var brushWeight = getBrushWeight();
					var brushRadious = brushWeight/2;
					var brushColor = getBrushColor();
					var ctx = canvas.getContext('2d');


					canvas.width = brushWeight;
					canvas.height = brushWeight;

					ctx.beginPath();
					ctx.arc(brushRadious, brushRadious, brushRadious, 0, 2 * Math.PI);
					ctx.strokeStyle = brushColor;
					ctx.lineWidth = 2;
					ctx.stroke();

					var cursorDataUrl = canvas.toDataURL();

					var cssCursorValue = "url('"+cursorDataUrl+"') "+brushRadious+" "+brushRadious+", auto";
					$canvas.css('cursor', cssCursorValue);
				}
			};

			var addDrawingPoint = function (x, y) {
				if (typeof drawingPaths[drawingTimestamp] == 'undefined') {
					drawingPaths[drawingTimestamp] = {
						brushWeight: getBrushWeight(),
						brushColor: getBrushColor(),
						points: []
					};
				}

				drawingPaths[drawingTimestamp].points.push({
					x: x,
					y: y
				});
			};

			var getBrushWeight = function () {
				if (0 == $brushWeightControl.length) {
					return defaultBrushWeight;
				}

				return $brushWeightControl.val();
			};

			var getBrushColor = function () {
				if (0 == $brushColorControl.lenght) {
					return defaultBrushColor;
				}

				return $brushColorControl.val();
			};

			var hasDrawingPaths = function () {
				return Object.keys(drawingPaths).length > 0;
			};

			var getMouseCursorPositionFromEvent = function (evt) {
				// debugger;
				return {
					x: evt.offsetX,
					y: evt.offsetY
				};
				// return {
				// 	x: evt.pageX - canvas.offsetLeft,
				// 	y: evt.pageY - canvas.offsetTop
				// };
			};

			var addFilter = function (name, value) {
				filters[name] = value;

				redraw();
			};

			var setImage = function (img, imgWidth, imgHeight) {
				image = {
					img: img,
					width: imgWidth,
					height: imgHeight
				};

				redraw();
			};

			var buildFiltersString = function () {
				var tmpFilters, filterName, filterValue, filterString;

				tmpFilters = []
				for(filterName in filters) {
					filterValue = filters[filterName];
					filterString = filterName + '(' + filterValue + ')';
					tmpFilters.push(filterString);
				}

				return tmpFilters.join(' ');
			};

			var hasFilters = function () {
				return Object.keys(filters).length > 0;
			};

			var redraw = function () {
				if (null == canvas) {
					return;
				}

				var ctx = canvas.getContext('2d');

				ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); // Clears the canvas

				if (hasFilters()) {
					ctx.filter = buildFiltersString();
				}
				
				if (null !== image) {
					ctx.drawImage(image.img, 0, 0, image.width, image.height);
				}

				if (hasDrawingPaths()) {
					ctx.lineJoin = "round";

					for(var pathTimestamp in drawingPaths) {
						var pathDetails = drawingPaths[pathTimestamp];
						var drawingPoints = pathDetails.points;

						drawingPoints.forEach(function(drawingPoint, index) {
							var prevPoint;

							ctx.beginPath();

							if (index > 0) {
								prevPoint = drawingPoints[index - 1];
								ctx.moveTo(prevPoint.x, prevPoint.y);
							} else {
								ctx.moveTo(drawingPoint.x, drawingPoint.y);
							}

							ctx.lineTo(drawingPoint.x, drawingPoint.y);
						    ctx.closePath();
						    ctx.strokeStyle = pathDetails.brushColor;
						    ctx.lineWidth = pathDetails.brushWeight;
						    ctx.stroke();
						});
					}					
				}
			};

			return {
				init: init,
				addFilter: addFilter,
				setImage: setImage,
				getCanvasDataUrl: getCanvasDataUrl,
				getCanvasDimensions: getCanvasDimensions
			};
		})();

		$getWebcamBtn.click(function(){
			if (typeof navigator.mediaDevices == 'undefined') {
				alert('Twoja przeglądarka nie obsługuje tej funkcji');
				return;
			}

			var mediaType = {
				video: true
			};

			var onSuccess = function (stream){
				if (typeof video == 'undefined') {
					video = document.createElement('video');
					$videoPlaceholder.empty();
					$videoPlaceholder.append(video);
				}
				
				try {
					video.srcObject = stream;
				} catch (error) {
					video.src = window.URL.createObjectURL(stream);
				}
				
				video.play();

				$takePhotoBtn.prop('disabled', '');
			};

			var onError = function (){
				console.log('error');
			};

			navigator.mediaDevices.getUserMedia(mediaType)
				.then(onSuccess, onError);
		});

		var createGalleryItemNode = function (imageData, originWidth, originHeight) {
			var $galleryItem = $('<div class="col-xs-12 col-sm-6 col-md-4 col-lg-3 gallery-item">' +
                        '<div class="card">' + 
                        	'<img src="" alt="" class="card-img-top js--preview">' +
                            '<div class="card-body text-center">' +
                                '<a href="#" class="btn btn-primary btn-sm download-btn" download>Pobierz</a>' +
                                '<button class="btn btn-danger btn-sm js--delete-gallery-item">Usuń</button>' +
                                '<button class="btn btn-success btn-sm js--edit-image">Edytuj</button>' +
                            '</div>' +
                        '</div>' +
                    '</div>');

			var $galleryItemImg = $galleryItem.find('img');

			$galleryItemImg.attr('src', imageData);
			$galleryItemImg.attr('data-origin-width', originWidth);
			$galleryItemImg.attr('data-origin-height', originHeight);

			$galleryItem.find('.download-btn').attr('href', imageData);

			return $galleryItem;
		};


		$takePhotoBtn.on('click', function(){
			var canvas = document.createElement('canvas');
			var context = canvas.getContext('2d');
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;
			context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

			var imageData = canvas.toDataURL();

			var $galleryItemNode = createGalleryItemNode(imageData, video.videoWidth, video.videoHeight);

			$galleryList.append($galleryItemNode);
		});


		// $('.js--delete-gallery-item').on('click', function() {
		$galleryList.on('click', '.js--delete-gallery-item', function() {	
			if (!confirm('Czy na pewno chcesz usunąć to zdjęcie?')) {
				return;
			}

			var $btn = $(this);
			var $galleryItem = $btn.closest('.gallery-item');

			$galleryItem.remove();
		});

		$deleteAllGalleryItemsBtn.on('click', function(){
			if (!confirm('Czy na pewno chcesz usunąć wszystkie zdjęcia?')) {
				return;
			}

			// $('.gallery-item').remove();
			$galleryList.empty();
		});

		$galleryList.on('click', '.js--preview', function (evt) {
			evt.preventDefault();

			var $this = $(this);
			var imageUrl = $this.attr('href');

			$.magnificPopup.open({
				items: {
					src: imageUrl
				},

				type: 'image'
			});
		});

		var $currentEditedImage = null;

		$galleryList.on('click', '.js--edit-image', function () {
			var $btn = $(this);
			var $galleryItem = $btn.closest('.gallery-item');
			var $img = $galleryItem.find('.js--preview');
			var imgOriginWidth = parseInt($img.attr('data-origin-width'));
			var imgOriginHeight = parseInt($img.attr('data-origin-height'));
			var img = $img[0];
			var canvas = document.createElement('canvas');

			var $canvasContainer = $imageEditorModal.find('.js--canvas-container');

			$currentEditedImage = $img;

			canvas.width = imgOriginWidth;
			canvas.height = imgOriginHeight;

			canvasEditor.init(canvas);
			canvasEditor.setImage(img, imgOriginWidth, imgOriginHeight);

			$canvasContainer.empty();
			$canvasContainer.append(canvas);

			$imageEditorModal.find('.js--filter').val(0);

			$imageEditorModal.modal('show');
		});

		$('.js--filter').on('change', function (){
			var $this = $(this);
			var value = parseFloat($this.val());
			var filterName = $this.attr('data-filter-name');
			var filterUnit = $this.attr('data-filter-unit');
			var filterValueWithUnit = value + filterUnit;

			canvasEditor.addFilter(filterName, filterValueWithUnit);
		});

		$('.js--image-editor-save-changes').on('click', function () {
			$currentEditedImage.attr('src', canvasEditor.getCanvasDataUrl());
		});

		$('.js--image-editor-save-as-new').on('click', function () {
			var canvasDataUrl = canvasEditor.getCanvasDataUrl();
			var canvasDimensions = canvasEditor.getCanvasDimensions();

			var $galleryItemNode = createGalleryItemNode(
									canvasDataUrl, 
									canvasDimensions.width, 
									canvasDimensions.height
								);

			$galleryList.append($galleryItemNode);
		});
	});

})(jQuery);